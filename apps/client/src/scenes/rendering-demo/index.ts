import { createScene, useWorld } from "@repo/engine";
import { Camera, Color, Shape, Transform2D } from "@repo/engine/components";

export const Scene = createScene("RenderingDemo")({
  setup() {
    createCamera();
    createShapes();
  },
});

function createCamera() {
  const world = useWorld();

  const cameraEntity = world.create();
  world.add(cameraEntity, new Transform2D(0, 0));
  world.add(cameraEntity, new Camera("orthographic", 300)); // orthoSize of 300 world units
}

function createShapes() {
  const world = useWorld();

  // Create a red rectangle in the center
  const rect1 = world.create();
  world.add(rect1, new Transform2D(0, 0));
  world.add(
    rect1,
    new Shape(
      "rectangle",
      100,
      80,
      new Color(0.9, 0.2, 0.2, 1), // Red fill
      new Color(0.5, 0.1, 0.1, 1), // Darker red stroke
      3,
      0,
    ),
  );

  // Create a blue circle to the left
  const circle1 = world.create();
  world.add(circle1, new Transform2D(-150, 0));
  world.add(
    circle1,
    new Shape(
      "circle",
      60,
      60,
      new Color(0.2, 0.4, 0.9, 1), // Blue fill
      new Color(0.1, 0.2, 0.5, 1), // Darker blue stroke
      2,
      0,
    ),
  );

  // Create a green rectangle to the right
  const rect2 = world.create();
  world.add(rect2, new Transform2D(150, 0));
  world.add(
    rect2,
    new Shape(
      "rectangle",
      50,
      120,
      new Color(0.2, 0.8, 0.3, 1), // Green fill
      null, // No stroke
      0,
      0,
    ),
  );

  // Create a semi-transparent yellow circle above
  const circle2 = world.create();
  world.add(circle2, new Transform2D(0, -120));
  world.add(
    circle2,
    new Shape(
      "circle",
      80,
      80,
      new Color(0.9, 0.8, 0.2, 0.7), // Semi-transparent yellow
      new Color(0.6, 0.5, 0.1, 1),
      4,
      1, // Higher layer
    ),
  );

  // Create some smaller shapes for visual interest
  for (let i = 0; i < 5; i++) {
    const smallShape = world.create();
    const angle = (i / 5) * Math.PI * 2;
    const radius = 200;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    world.add(smallShape, new Transform2D(x, y, angle)); // Rotated based on position
    world.add(
      smallShape,
      new Shape(
        i % 2 === 0 ? "rectangle" : "circle",
        30,
        30,
        new Color(
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5,
          1,
        ),
        new Color(0.2, 0.2, 0.2, 1),
        1,
        0,
      ),
    );
  }
}
