from pathlib import Path

import cv2
import numpy as np


def analyze_visual_anomalies(image_path: str) -> dict:
    """
    Analyze an image for basic visual anomalies that may indicate
    editing or manipulation.

    This is a heuristic layer. It does not prove that a document
    is forged; it generates visual risk indicators.
    """

    path = Path(image_path)

    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")

    image = cv2.imread(str(path))

    if image is None:
        raise ValueError("Unable to read the image.")

    # Resize very large images to keep processing fast.
    max_dimension = 1600
    height, width = image.shape[:2]

    if max(height, width) > max_dimension:
        scale = max_dimension / max(height, width)
        image = cv2.resize(
            image,
            (
                int(width * scale),
                int(height * scale),
            ),
            interpolation=cv2.INTER_AREA,
        )

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # --------------------------------------------------
    # 1. Edge analysis
    # --------------------------------------------------

    edges = cv2.Canny(gray, 80, 180)

    edge_density = float(
        np.count_nonzero(edges) / edges.size
    )

    # --------------------------------------------------
    # 2. Local texture analysis
    # --------------------------------------------------

    laplacian = cv2.Laplacian(
        gray,
        cv2.CV_64F,
    )

    global_texture = float(
        laplacian.var()
    )

    # Divide image into blocks and compare their
    # texture against the overall median.
    block_size = 64

    texture_values = []

    for y in range(0, gray.shape[0], block_size):
        for x in range(0, gray.shape[1], block_size):

            block = gray[
                y:min(y + block_size, gray.shape[0]),
                x:min(x + block_size, gray.shape[1]),
            ]

            if block.size < 100:
                continue

            block_laplacian = cv2.Laplacian(
                block,
                cv2.CV_64F,
            )

            texture_values.append(
                float(block_laplacian.var())
            )

    texture_anomaly_score = 0.0
    suspicious_blocks = 0

    if texture_values:

        median_texture = float(
            np.median(texture_values)
        )

        if median_texture > 0:

            for value in texture_values:

                difference = abs(
                    value - median_texture
                ) / median_texture

                if difference > 2.0:
                    suspicious_blocks += 1

            texture_anomaly_score = min(
                suspicious_blocks / len(texture_values),
                1.0,
            )

    # --------------------------------------------------
    # 3. Overall visual risk
    # --------------------------------------------------

    visual_risk = 0

    reasons = []

    # Extremely unusual texture distribution.
    if texture_anomaly_score > 0.15:

        visual_risk += 30

        reasons.append({
            "title": "Local texture inconsistency",
            "severity": "high",
            "description": (
                "Some regions have substantially different "
                "visual texture from the rest of the document."
            ),
        })

    elif texture_anomaly_score > 0.08:

        visual_risk += 15

        reasons.append({
            "title": "Minor texture inconsistency",
            "severity": "medium",
            "description": (
                "Small regions show visual characteristics "
                "that differ from the surrounding document."
            ),
        })

    # Very low edge density can indicate a problematic/
    # low-quality image rather than fraud.
    if edge_density < 0.005:

        visual_risk += 10

        reasons.append({
            "title": "Low visual detail",
            "severity": "low",
            "description": (
                "The document image contains very little "
                "detectable visual detail."
            ),
        })

    # Very high texture can indicate noise or image processing.
    if global_texture > 2500:

        visual_risk += 10

        reasons.append({
            "title": "Unusual image texture",
            "severity": "low",
            "description": (
                "The image contains unusually high local "
                "pixel variation and may need manual review."
            ),
        })

    visual_risk = min(
        visual_risk,
        50,
    )

    return {
        "visual_risk_score": visual_risk,
        "edge_density": round(edge_density, 6),
        "texture_variance": round(global_texture, 2),
        "texture_anomaly_score": round(
            texture_anomaly_score,
            4,
        ),
        "suspicious_blocks": suspicious_blocks,
        "issues": reasons,
    }