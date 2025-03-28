// Module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Events = Matter.Events;

// Create an engine
const engine = Engine.create();
const world = engine.world;

// Get the canvas element
const canvas = document.getElementById('gameCanvas');

// Determine canvas size (popup default is small, let's make it bigger)
const canvasWidth = 800;
const canvasHeight = 600;
canvas.width = canvasWidth;
canvas.height = canvasHeight;


// Create a renderer
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: canvasWidth,
        height: canvasHeight,
        wireframes: false, // Show shapes filled
        background: '#87CEEB' // Sky blue background
    }
});

// Create runner
const runner = Runner.create();

// --- Game Elements ---

// Player (Stick Man - simplified as a box for now)
const playerRadius = 20;
const player = Bodies.circle(canvasWidth / 4, canvasHeight - 100, playerRadius, {
    frictionAir: 0.01,
    restitution: 0.1, // Less bouncy
    density: 0.002,
    render: {
        fillStyle: '#FF0000' // Red color for player
    }
});

// Ground and basic terrain
const ground = Bodies.rectangle(canvasWidth / 2, canvasHeight - 25, canvasWidth, 50, { isStatic: true });
const wallLeft = Bodies.rectangle(0 - 25, canvasHeight / 2, 50, canvasHeight, { isStatic: true });
const wallRight = Bodies.rectangle(canvasWidth + 25, canvasHeight / 2, 50, canvasHeight, { isStatic: true });
const ceiling = Bodies.rectangle(canvasWidth / 2, 0 - 25, canvasWidth, 50, { isStatic: true });

// Simple platform
const platform1 = Bodies.rectangle(canvasWidth * 0.6, canvasHeight * 0.7, 200, 30, { isStatic: true });

// Add all bodies to the world
Composite.add(world, [
    player,
    ground,
    wallLeft,
    wallRight,
    ceiling,
    platform1
]);

// --- Grappling Hook Logic ---
let grapplePoint = null; // The point the grapple is attached to
let grappleConstraint = null; // The Matter.js constraint for the grapple
let isGrappling = false;
const maxGrappleLength = 300; // Max distance the grapple can reach

// Mouse control for aiming/firing grapple
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2, // Allows some interaction, but not for grappling
        render: {
            visible: false // Don't show the default mouse constraint visuals
        }
    }
});
Composite.add(world, mouseConstraint);

// Keep track of mouse clicks for grappling
Events.on(mouseConstraint, 'mousedown', (event) => {
    const mousePosition = event.mouse.position;

    // Check if clicking on a static body (potential grapple point)
    const bodiesUnderMouse = Matter.Query.point(Composite.allBodies(world), mousePosition);
    let clickedStaticBody = null;
    for (const body of bodiesUnderMouse) {
        if (body.isStatic && body !== ground && body !== wallLeft && body !== wallRight && body !== ceiling) { // Don't grapple to boundaries
             // Check distance
            const distance = Matter.Vector.magnitude(Matter.Vector.sub(mousePosition, player.position));
            if (distance <= maxGrappleLength) {
                clickedStaticBody = body;
                grapplePoint = mousePosition; // Use the exact click point
                break;
            }
        }
    }


    if (clickedStaticBody && !isGrappling) {
        // Create the grapple constraint
        grappleConstraint = Constraint.create({
            pointA: player.position, // Attach to player's center (will update)
            bodyB: player,
            pointB: { x: 0, y: 0 }, // Relative offset from player center
            // Use the exact click point, not the body's center
            // We need a fixed point in the world, so we don't attach to bodyB
            // Instead, we use pointA as the world point and bodyB as the player
             pointA: grapplePoint, // The world point clicked
             bodyB: player,
             pointB: { x: 0, y: 0 }, // Attach to player center
            length: Matter.Vector.magnitude(Matter.Vector.sub(grapplePoint, player.position)), // Initial length
            stiffness: 0.05, // Rope-like stiffness
            damping: 0.01, // Slows down oscillations
            render: {
                strokeStyle: '#000000',
                lineWidth: 2
            }
        });
        Composite.add(world, grappleConstraint);
        isGrappling = true;
    }
});

Events.on(mouseConstraint, 'mouseup', (event) => {
    // Release grapple
    if (isGrappling && grappleConstraint) {
        Composite.remove(world, grappleConstraint);
        grappleConstraint = null;
        grapplePoint = null;
        isGrappling = false;
    }
});


// --- Game Loop ---
Events.on(engine, 'beforeUpdate', (event) => {
    // Keep player within bounds slightly (optional, prevents sticking)
    if (player.position.x < playerRadius) {
        Matter.Body.setPosition(player, { x: playerRadius, y: player.position.y });
        Matter.Body.setVelocity(player, { x: 0, y: player.velocity.y });
    }
    if (player.position.x > canvasWidth - playerRadius) {
         Matter.Body.setPosition(player, { x: canvasWidth - playerRadius, y: player.position.y });
         Matter.Body.setVelocity(player, { x: 0, y: player.velocity.y });
    }

    // Simple win condition (example: reach top right)
    if (player.position.x > canvasWidth - 50 && player.position.y < 50) {
        console.log("You Win!");
        // Could add more robust win logic here (e.g., display message)
        Engine.clear(engine); // Stop the engine
        Render.stop(render);
        Runner.stop(runner);
        alert("You Win!"); // Simple win message
    }
});


// Run the renderer
Render.run(render);

// Run the engine runner
Runner.run(runner, engine);

console.log("Game Initialized");