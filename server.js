// Author: Ryan Hong 
// Introduction to Web Development: Project 5
// Babylon GLB

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.static("public")); // Serve everything inside the public folder

let sceneState = {
    models: []
}
let hostSocket = null;

function broadcastState() {
    const payload = JSON.stringify({
        type: "state",
        data: sceneState
    });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

wss.on("connection", (ws) => {

    if (!hostSocket) {
        // Client logic

        hostSocket = ws;
        ws.role = "host";
        //Tell they are host
        console.log("Client connected, assigned as HOST")

        ws.send(JSON.stringify({ type: "role", role: "host"}));

    } else {
        ws.role = "spectator";
        console.log("Client connected, assigned as SPECTATOR");
        //Tell they are spectator
        ws.send(JSON.stringify({ type: "role", role: "spectator"}))
    }
        ws.send(JSON.stringify ({
            type: "state",
            data: sceneState
        }));

    ws.on("message", (message) => {
        try {
                const data = JSON.parse(message);
                 if (data.type === "loadModel") {
                    if (ws !== hostSocket) return;

                    sceneState.models.push({
                        id: Date.now().toString(),
                        fileName: data.fileName,
                        position: data.position
                    });
                    console.log(`Host added Model: ${data.fileName}`);
                   broadcastState();
                 }
             } catch (err) {
                 console.error("Failed to parse message:", err);
             }
        });

        ws.on("close", () => {
            if (ws === hostSocket) {
                console.log("Host has disconnected.")
                hostSocket = null;
                sceneState = { models: [] };
            } else {
                console.log("Spectator has disconnected.")
            }
        });
    });

server.listen(3000, () => {
    console.log("Server is running at http://localhost:3000");
});
