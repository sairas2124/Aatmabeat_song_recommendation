# Train Emotion Model from Roboflow CSV (with bounding boxes)

import os
import json
import pandas as pd
import numpy as np
import tensorflow as tf
from pathlib import Path
from sklearn.model_selection import train_test_split

from tensorflow.keras import layers, models, callbacks, regularizers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# ---------------- CONFIG ----------------
IMG_SIZE = (224,224)
BATCH_SIZE = 32
FREEZE_EPOCHS = 5
EPOCHS = 50
LR = 1e-3
VAL_SPLIT = 0.1
SEED = 42
WEIGHT_DECAY = 2e-5

DATA_DIR = r"C:\Users\predator\Desktop\projectedit\image\faces\train"
CSV_PATH = os.path.join(DATA_DIR, "_annotations.csv")
IMAGE_DIR = r"C:\Users\predator\Desktop\projectedit\image\faces\train"

MODEL_PATH = "models/emotion_cnn.keras"
LABELS_PATH = "models/emotion_labels.json"

# ---------------------------------------


def load_dataframe():
    df = pd.read_csv(CSV_PATH)

    df["filepath"] = df["filename"].apply(
        lambda x: os.path.join(IMAGE_DIR, x)
    )

    labels = sorted(df["class"].unique().tolist())
    label_map = {name:i for i,name in enumerate(labels)}
    df["label_id"] = df["class"].map(label_map)

    os.makedirs("models", exist_ok=True)
    with open(LABELS_PATH,"w") as f:
        json.dump(labels,f,indent=2)

    print("✅ Classes:", labels)
    return df, labels


# ---------- IMAGE LOADING + CROP ----------
def load_and_crop(path, xmin, ymin, xmax, ymax, label):
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)

    xmin = tf.cast(xmin, tf.int32)
    ymin = tf.cast(ymin, tf.int32)
    xmax = tf.cast(xmax, tf.int32)
    ymax = tf.cast(ymax, tf.int32)

    img = img[ymin:ymax, xmin:xmax]
    img = tf.image.resize(img, IMG_SIZE)
    img = preprocess_input(img)

    label = tf.one_hot(label, depth=3)
    return img, label


def build_dataset(df, training=True):
    ds = tf.data.Dataset.from_tensor_slices((
        df["filepath"].values,
        df["xmin"].values,
        df["ymin"].values,
        df["xmax"].values,
        df["ymax"].values,
        df["label_id"].values
    ))

    ds = ds.map(load_and_crop,
                num_parallel_calls=tf.data.AUTOTUNE)

    if training:
        ds = ds.shuffle(1000)

    ds = ds.batch(BATCH_SIZE)
    ds = ds.prefetch(tf.data.AUTOTUNE)
    return ds


def compute_class_weights(labels, n):
    counts = np.bincount(labels, minlength=n)
    total = counts.sum()
    weights = {}
    for i in range(n):
        weights[i] = total/(n*counts[i])
    print("Class counts:",counts)
    print("Class weights:",weights)
    return weights


# -------- MODEL --------
def build_model(num_classes):
    base = MobileNetV2(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMG_SIZE,3)
    )
    base.trainable=False

    inputs = layers.Input(shape=(*IMG_SIZE,3))
    x = base(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.35)(x)

    x = layers.Dense(
        192,
        activation="relu",
        kernel_regularizer=regularizers.l2(WEIGHT_DECAY)
    )(x)

    x = layers.Dropout(0.35)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    return models.Model(inputs,outputs), base


# -------- MAIN --------
def main():
    tf.random.set_seed(SEED)

    df, labels = load_dataframe()
    nclass = len(labels)

    train_df, val_df = train_test_split(
        df,
        test_size=VAL_SPLIT,
        stratify=df["label_id"],
        random_state=SEED
    )

    train_ds = build_dataset(train_df,True)
    val_ds = build_dataset(val_df,False)

    class_weights = compute_class_weights(
        train_df["label_id"].values,
        nclass
    )

    model, base = build_model(nclass)

    

    cb = [
        callbacks.ModelCheckpoint(
            MODEL_PATH,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            verbose=1
        )
    ]

    # -------- Phase 1 --------
    print("\n🚀 Phase 1")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(LR),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )

    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=FREEZE_EPOCHS,
        class_weight=class_weights,
        callbacks=cb
    )

    # -------- Phase 2 --------
    print("\n🚀 Phase 2")

    start = int(len(base.layers)*0.66)
    for layer in base.layers[start:]:
        if not isinstance(layer,layers.BatchNormalization):
            layer.trainable=True

    model.compile(
        optimizer=tf.keras.optimizers.Adam(LR*0.1),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )

    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        class_weight=class_weights,
        callbacks=cb
    )

    model.save(str(MODEL_PATH))
    print("\n✅ Training Finished")
    print("Model:",MODEL_PATH)
    print("Labels:",LABELS_PATH)


if __name__=="__main__":
    main()