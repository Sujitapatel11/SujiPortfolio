import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

// Canonical face mesh landmark topology connections (outline, eyes, eyebrows, nose, mouth)
export const FACE_CONNECTIONS = [
  // Face Outline
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172], [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
  // Left Eyebrow
  [70, 63], [63, 105], [105, 66], [66, 107], [107, 55], [55, 65], [65, 52], [52, 53], [53, 46],
  // Right Eyebrow
  [336, 296], [296, 334], [334, 293], [293, 300], [300, 285], [285, 295], [295, 282], [282, 283], [283, 276],
  // Left Eye
  [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
  // Right Eye
  [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263],
  // Nose Bridge & Tip
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 19], [19, 94], [94, 2],
  // Outer Lips
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291], [291, 61],
  // Inner Lips
  [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318], [318, 324], [324, 308], [308, 78]
];

// Fallback normalized landmark points (centered around 0, range [-1, 1])
export const FALLBACK_LANDMARKS = [
  // Face Outline
  { x: 0.0, y: 0.85, z: 0 }, { x: 0.25, y: 0.8, z: 0.02 }, { x: 0.45, y: 0.7, z: 0.05 }, { x: 0.6, y: 0.5, z: 0.08 },
  { x: 0.7, y: 0.25, z: 0.1 }, { x: 0.75, y: 0.0, z: 0.12 }, { x: 0.73, y: -0.25, z: 0.1 }, { x: 0.65, y: -0.5, z: 0.08 },
  { x: 0.5, y: -0.7, z: 0.05 }, { x: 0.3, y: -0.85, z: 0.02 }, { x: 0.0, y: -0.92, z: 0 }, { x: -0.3, y: -0.85, z: 0.02 },
  { x: -0.5, y: -0.7, z: 0.05 }, { x: -0.65, y: -0.5, z: 0.08 }, { x: -0.73, y: -0.25, z: 0.1 }, { x: -0.75, y: 0.0, z: 0.12 },
  { x: -0.7, y: 0.25, z: 0.1 }, { x: -0.6, y: 0.5, z: 0.08 }, { x: -0.45, y: 0.7, z: 0.05 }, { x: -0.25, y: 0.8, z: 0.02 },

  // Left Eyebrow & Eye
  { x: -0.4, y: 0.38, z: 0.1 }, { x: -0.25, y: 0.42, z: 0.12 }, { x: -0.12, y: 0.38, z: 0.1 },
  { x: -0.38, y: 0.26, z: 0.08 }, { x: -0.26, y: 0.28, z: 0.1 }, { x: -0.14, y: 0.26, z: 0.08 }, { x: -0.26, y: 0.22, z: 0.07 },

  // Right Eyebrow & Eye
  { x: 0.12, y: 0.38, z: 0.1 }, { x: 0.25, y: 0.42, z: 0.12 }, { x: 0.4, y: 0.38, z: 0.1 },
  { x: 0.14, y: 0.26, z: 0.08 }, { x: 0.26, y: 0.28, z: 0.1 }, { x: 0.38, y: 0.26, z: 0.08 }, { x: 0.26, y: 0.22, z: 0.07 },

  // Nose Bridge & Nostrils
  { x: 0.0, y: 0.35, z: 0.12 }, { x: 0.0, y: 0.15, z: 0.18 }, { x: 0.0, y: -0.05, z: 0.22 },
  { x: -0.1, y: -0.12, z: 0.16 }, { x: 0.0, y: -0.14, z: 0.2 }, { x: 0.1, y: -0.12, z: 0.16 },

  // Mouth (Lips)
  { x: -0.28, y: -0.36, z: 0.1 }, { x: -0.14, y: -0.32, z: 0.14 }, { x: 0.0, y: -0.33, z: 0.15 },
  { x: 0.14, y: -0.32, z: 0.14 }, { x: 0.28, y: -0.36, z: 0.1 }, { x: 0.14, y: -0.44, z: 0.12 },
  { x: 0.0, y: -0.46, z: 0.13 }, { x: -0.14, y: -0.44, z: 0.12 },

  // Outer Floating Nodes (Digital Identity feel)
  { x: -1.05, y: 0.65, z: -0.15 }, { x: 1.1, y: 0.7, z: -0.2 }, { x: -1.15, y: -0.3, z: -0.1 },
  { x: 1.08, y: -0.45, z: -0.25 }, { x: -0.8, y: 0.95, z: -0.3 }, { x: 0.85, y: 0.9, z: -0.25 },
  { x: 0.0, y: 1.15, z: -0.35 }, { x: 0.0, y: -1.15, z: -0.2 }
];

/**
 * Detect face landmarks using MediaPipe Tasks Vision FaceLandmarker.
 * Falls back seamlessly to FALLBACK_LANDMARKS if unavailable.
 */
export async function detectFaceLandmarks(imageSrc) {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: 'GPU'
      },
      runningMode: 'IMAGE',
      numFaces: 1
    });

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const results = faceLandmarker.detect(img);
          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const rawLandmarks = results.faceLandmarks[0];
            // Convert normalized [0, 1] to centered [-1, 1] 3D coordinates
            const points = rawLandmarks.map((lm) => ({
              x: (lm.x - 0.5) * 2.0,
              y: (0.5 - lm.y) * 2.2, // flip y
              z: -lm.z * 1.5
            }));
            
            // Add outer floating digital identity nodes
            const floatingNodes = [
              { x: -1.1, y: 0.7, z: -0.2 },
              { x: 1.15, y: 0.75, z: -0.18 },
              { x: -1.2, y: -0.35, z: -0.15 },
              { x: 1.12, y: -0.5, z: -0.22 },
              { x: -0.85, y: 1.0, z: -0.3 },
              { x: 0.9, y: 0.95, z: -0.25 },
              { x: 0.0, y: 1.2, z: -0.35 },
              { x: 0.0, y: -1.2, z: -0.25 }
            ];
            resolve([...points, ...floatingNodes]);
          } else {
            console.warn("MediaPipe detected 0 faces. Using fallback face mesh topology.");
            resolve(FALLBACK_LANDMARKS);
          }
        } catch (err) {
          console.warn("Error running FaceLandmarker detect:", err);
          resolve(FALLBACK_LANDMARKS);
        }
      };
      img.onerror = (e) => {
        console.warn("Failed to load photo for MediaPipe detection. Using fallback landmarks.", e);
        resolve(FALLBACK_LANDMARKS);
      };
      img.src = imageSrc;
    });
  } catch (error) {
    console.warn("Could not initialize MediaPipe Tasks Vision. Using fallback face mesh.", error);
    return FALLBACK_LANDMARKS;
  }
}
