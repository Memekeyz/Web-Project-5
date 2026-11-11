// Author: Ryan Hong 
// Introduction to Web Development: Project 5
// Babylon GLB

/*
 * APPLICATION OVERVIEW
 * ---------------------------------------------------------
 * 1. HTML provides a file selector and a canvas element.
 * 2. CSS sizes the canvas so it fills the browser window.
 * 3. BabylonJS creates a scene, camera, and light source.
 * 4. The user selects one or more GLB model files.
 * 5. JavaScript imports each model into the scene.
 * 6. Each model is scaled and positioned automatically.
 * 7. BabylonJS continuously renders the scene in the canvas.
 * ---------------------------------------------------------
 */

const canvas = document.getElementById("renderCanvas") || document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const fileInput = document.getElementById("glbFileInput");
const ws = new WebSocket(`ws://${window.location.host}`);

let userRole = "spectator";
let scene;            // global
let loadedModelCount = 0;
const spacing = 10;

const createScene = async () => {
    const newScene = new BABYLON.Scene(engine); // local to function
    const camera = new BABYLON.ArcRotateCamera("camera", 0.0, toRadians(90.0), 15, new BABYLON.Vector3(0, 0, 0), newScene);
    camera.attachControl(canvas, true);

    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), newScene);
    light.intensity = 0.7;

    return newScene;
};
// End of createScene


function toRadians(degrees) {
    return degrees * Math.PI / 180.0;
}

ws.onmessage = async (event) => {
    try {
        const message = JSON.parse(event.data);

        if (message.type === "role") {
            userRole = message.role;
            console.log(`Assigned role: ${userRole}`);

            if (userRole === "spectator") {
                fileInput.disabled = true;
                document.title = "Spectator - BabylonJS Viewer";
            } else {
                document.title = "Host - BabylonJS Viewer";
            }
        }
        else if (message.type === "state") {
            console.log("Received state from server:", message.data)
            syncSceneModels(message.data.models);
        }
    } catch (err) {
        console.error("Error parsing message", err)
    }
};

let currentLoadedCount = 0;

async function syncSceneModels(models) {
    if (!scene) return;

    for (let i = currentLoadedCount; i < models.length; i++) {
        const modelInfo = models[i];
        await loadedModelFile(modelInfo.fileName, modelInfo.position);
    }
    currentLoadedCount = models.length;
}

//https://www.w3schools.com/js/js_function_iife.asp
// An Immediately Invoked Function Expression (IIFE)
(async () => {scene = await createScene();})(); // Execute anonymous aync function

async function loadedModelFile(fileName, customPosition) {
    /*
         * MODEL LOADING WORKFLOW
         * ------------------------------------------------
         * 1. User selects a GLB file from the file picker.
         * 2. BabylonJS imports the model into the scene.
         * 3. The model is automatically scaled to a
         *    consistent size.
         * 4. The model's center point is calculated.
         * 5. The model is positioned beside previously
         *    loaded models.
         * 6. The render loop displays the updated scene.
         * ------------------------------------------------
         */

        // https://doc.babylonjs.com/typedoc/functions/BABYLON.ImportMeshAsync

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "/",
            fileName,
            scene,
            null,
            ".glb"
        );

        if (result.meshes && result.meshes.length > 0) {   // Verify that one or more meshes were imported
            const rootMesh = result.meshes[0];             // Use the first mesh as the root mesh
            const bounds = rootMesh.getHierarchyBoundingVectors(); // Obtain bounding box information for the model
            const size = bounds.max.subtract(bounds.min);  // Calculate the model dimensions
            const largestDimension = Math.max(size.x, size.y, size.z); // Find the largest dimension
            const scale = 5 / largestDimension;            // Calculate a scaling factor for consistent model size

            rootMesh.scaling = new BABYLON.Vector3(scale, scale, scale);
            const scaledBounds = rootMesh.getHierarchyBoundingVectors();
            const scaledSize = scaledBounds.max.subtract(scaledBounds.min);
            const center = scaledBounds.min.add(scaledSize.scale(0.5));

            rootMesh.position = new BABYLON.Vector3(
                customPosition.x - center.x,
                customPosition.y - center.y,
                customPosition.z - center.z
            );
            console.log(`Successfully rendered ${fileName}`);
        }
    } catch (error) {
        console.error(`Error loading model ${fileName}: `, error);
    }
}

// Handle file input change event
// This function executes when the user selects a file
fileInput.addEventListener("change", (event) => {
    if (userRole !== "host") return;

    const file = event.target.files[0];
    if (!file || !scene) return;

    let xPos = 0;
    if (loadedModelCount > 0) {
        const step = Math.ceil(loadedModelCount / 2); 
        xPos = (loadedModelCount % 2 === 1) ? -step * spacing : step * spacing;
    } 
    loadedModelCount++;

    const position = { x: xPos, y: 0, z: 0 };

    ws.send(JSON.stringify ({
        type: "loadModel",
        fileName: file.name,
        position: position
    }));
});

// Run the engine
engine.runRenderLoop(() => {    // Start BabylonJS's continuous render loop
    if (scene) {                // Start BabylonJS's continuous render loop
        scene.render();         // Render one frame of the scene
    }
});

// Resize the engine on window resize
window.addEventListener("resize", () => {   // Execute when the browser window changes size
    engine.resize();                        // Resize the rendering engine to match the canvas
});