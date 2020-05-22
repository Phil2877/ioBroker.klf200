"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const propertyLink_1 = require("./util/propertyLink");
const stateHelper_1 = require("./util/stateHelper");
class SetupScenes {
    static async createScenesAsync(adapter, scenes) {
        const disposableEvents = [];
        for (const scene of scenes) {
            if (scene) {
                disposableEvents.push(...(await this.createSceneAsync(adapter, scene)));
            }
        }
        // Write number of products
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `scenes.scenesFound`, {
            name: "Number of scenes found",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            def: 0,
            desc: "Number of scenes defined in the interface",
        }, {}, scenes.length);
        return disposableEvents;
    }
    static async createSceneAsync(adapter, scene) {
        const disposableEvents = [];
        await adapter.setObjectNotExistsAsync(`scenes.${scene.SceneID}`, {
            type: "channel",
            common: {
                name: scene.SceneName,
                role: "scene",
            },
            native: {},
        });
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `scenes.${scene.SceneID}.productsCount`, {
            name: "productsCount",
            role: "value",
            type: "number",
            read: true,
            write: false,
            desc: "Number of products in the scene",
        }, {}, scene.Products.length);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `scenes.${scene.SceneID}.run`, {
            name: "run",
            role: "button.play",
            type: "boolean",
            read: true,
            write: true,
            desc: "Shows the running state of a scene. Set to true to run a scene.",
        }, {}, scene.IsRunning);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `scenes.${scene.SceneID}.stop`, {
            name: "stop",
            role: "button.play",
            type: "boolean",
            read: false,
            write: true,
            desc: "Set to true to stop a running scene.",
        }, {}, false);
        // Setup scene listeners
        disposableEvents.push(new propertyLink_1.ComplexPropertyChangedHandler(adapter, "IsRunning", scene, async (newValue) => {
            const result = await adapter.setStateAsync(`scenes.${scene.SceneID}.run`, newValue, true);
            if (newValue === false) {
                /*
                    If a running scene was stopped by using the stop state,
                    the stop state should be reset to false.
                */
                await adapter.setStateChangedAsync(`scenes.${scene.SceneID}.stop`, false, true);
            }
            return result;
        }), new propertyLink_1.ComplexPropertyChangedHandler(adapter, "Products", scene, async (newValue) => {
            return await adapter.setStateChangedAsync(`scenes.${scene.SceneID}.productsCount`, newValue.length, true);
        }));
        // Setup state listeners
        const stopListener = new propertyLink_1.ComplexStateChangeHandler(adapter, "stop", async (state) => {
            if (state !== undefined) {
                if ((state === null || state === void 0 ? void 0 : state.val) === true) {
                    // If the scene is running, acknowledge the stop state and stop the scene.
                    if (scene.IsRunning) {
                        // Acknowledge stop state first
                        await adapter.setStateAsync("stop", state, true);
                        await scene.stopAsync();
                    }
                    else {
                        // Set the stop state back to false, directly.
                        await adapter.setStateAsync("stop", false, true);
                    }
                }
            }
        });
        await stopListener.Initialize();
        disposableEvents.push(stopListener);
        return disposableEvents;
    }
}
exports.SetupScenes = SetupScenes;