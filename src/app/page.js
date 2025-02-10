"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [gpuId, setGpuId] = useState("");
  const [workflowType, setWorkflowType] = useState("comfyui");
  const [workflowFile, setWorkflowFile] = useState(null);
  const [seed, setSeed] = useState("");
  const [resultImage, setResultImage] = useState(null);
  const [status, setStatus] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [runpodApiKey, setRunpodApiKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [modelsToChoose, setModelsToChoose] = useState([]); // Stores models to choose from
  const [availableModels, setAvailableModels] = useState([]); // Stores available models from RunPod
  const [selectedModels, setSelectedModels] = useState({}); // Stores selected models

  useEffect(() => {
    // Lấy API key từ localStorage khi component được mount
    const storedApiKey = localStorage.getItem("runpodApiKey");
    if (storedApiKey) {
      setRunpodApiKey(storedApiKey);
    }
  }, []);

  const handleRunpodApiKeyChange = (e) => {
    setRunpodApiKey(e.target.value);
  };

  const handleSaveApiKey = () => {
    // Lưu API key vào localStorage
    localStorage.setItem("runpodApiKey", runpodApiKey);
    alert("API key saved!");
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    const randomSeed = Math.floor(Math.random() * 999999999999999) + 1;
    setSeed(randomSeed.toString());
  }, []);

  const handleGpuIdChange = (e) => {
    setGpuId(e.target.value);
  };

  const handleWorkflowTypeChange = (e) => {
    setWorkflowType(e.target.value);
  };

  function generateJsonFormat(inputJson, batchId, origin, destination, graphId) {
    // Initialize the output JSON structure
    const outputJson = {
      batch: {
        batch_id: batchId,
        origin: origin,
        destination: destination,
        data: [],
        graph: {
          id: graphId,
          nodes: {},
          edges: []
        },
        workflow: inputJson, // Append the original JSON file
        runs: 1
      },
      prepend: false
    };
  
    // Populate nodes if they are not null or empty
  if (inputJson.nodes && inputJson.nodes.length > 0) {
    inputJson.nodes.forEach(node => {
      // Skip adding nodes with null or empty values
      if (node && node.data) {
        const formattedNode = {
          id: node.id,
          is_intermediate: node.data.isIntermediate || false,
          use_cache: node.data.useCache || false,
          ...Object.keys(node.data.inputs || {}).reduce((inputs, key) => {
            const inputValue = node.data.inputs[key]?.value;
            if (inputValue !== null && inputValue !== undefined) {
              inputs[key] = inputValue;
            }
            return inputs;
          }, {}),
          type: node.data.type
        };

        // Only add the node if it has valid properties
        if (Object.keys(formattedNode).length > 3) { // Ensures the node is not empty beyond metadata
          outputJson.batch.graph.nodes[node.id] = formattedNode;
        }
      }
    });
  }

  // Populate edges if they exist
  if (inputJson.edges && inputJson.edges.length > 0) {
    inputJson.edges.forEach(edge => {
      if (edge && edge.source && edge.target) {
        // Only add the edge if the field is not null
        const sourceField = edge.sourceHandle || null;
        const targetField = edge.targetHandle || null;
  
        if (sourceField !== null || targetField !== null) {
          outputJson.batch.graph.edges.push({
            source: {
              node_id: edge.source,
              field: sourceField
            },
            destination: {
              node_id: edge.target,
              field: targetField
            }
          });
        }
      }
    });
  }
  
    return outputJson;
  }

  const handleWorkflowFileChange = (e) => {
    setWorkflowFile(e.target.files[0]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflowData = JSON.parse(e.target.result);
        if (workflowType === "invokeai") {
          // Extract models from the workflow JSON
          const models = [];
          workflowData.nodes.forEach((node) => {
            if (node.data.inputs) {
              Object.values(node.data.inputs).forEach((input) => {
                if (input.value && input.value.type) {
                  models.push({
                    type: input.value.type,
                    key: input.value.key,
                    hash: input.value.hash,
                    name: input.value.name,
                  });
                }
              });
            }
          });

          setModelsToChoose(models); // Set models to choose from
          fetchAvailableModels(); // Fetch available models from RunPod

        // Extract image nodes from InvokeAI workflow
        const imageNodes = [];
        workflowData.nodes.forEach(node => {
          if (node.data && node.data.inputs) {
            Object.entries(node.data.inputs).forEach(([inputName, input]) => {
              if (input.value && input.value.image_name) {
                imageNodes.push({
                  nodeId: node.id,
                  imageName: input.value.image_name
                });
              }
            });
          }
        });

        // Initialize image file array if image nodes found
        if (imageNodes.length > 0) {
          setImageFiles(Array(imageNodes.length).fill(null));
        }
        }
        else if (workflowType == "comfyui") {
          const imageNodes = [];
          for (const nodeId in workflowData) {
            const node = workflowData[nodeId];
          if (node.class_type === "LoadImage" && node.inputs.image) {
            imageNodes.push({
                nodeId: nodeId,
                imageName: node.inputs.image,
              });
            }
          }

          if (imageNodes.length > 0) {
            setImageFiles(Array(imageNodes.length).fill(null));
          }
        }
      } catch (error) {
        console.error("Error parsing workflow JSON:", error);
      }
    };
    if (e.target.files[0]) {
      reader.readAsText(e.target.files[0]);
    }
  };
  const fetchAvailableModels = async () => {
    try {
      const payload = {
        input: {
          get_models_tree_invokeai: true,
        },
      };
  
      const response = await axios.post(
        `https://api.runpod.ai/v2/${gpuId}/run`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${runpodApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      const requestId = response.data.id;
      const intervalId = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `https://api.runpod.ai/v2/${gpuId}/status/${requestId}`,
            {
              headers: {
                Authorization: `Bearer ${runpodApiKey}`,
              },
            }
          );
  
          if (statusResponse.data.status === "COMPLETED") {
            clearInterval(intervalId);
            // Ensure availableModels is always an array
            console.log(statusResponse.data.output);
            const models = statusResponse.data.output.data || [];
            console.log(models);
            setAvailableModels(models);
          }
        } catch (error) {
          clearInterval(intervalId);
          console.error("Error fetching available models:", error);
          setAvailableModels([]); // Fallback to an empty array
        }
      }, 3000);
    } catch (error) {
      console.error("Error fetching available models:", error);
      setAvailableModels([]); // Fallback to an empty array
    }
  };

  const handleModelSelection = (modelKey, selectedKey) => {
    setSelectedModels((prev) => ({
      ...prev,
      [modelKey]: selectedKey,
    }));
  };

  const handleSeedChange = (e) => {
    setSeed(e.target.value);
  };

  function handleSubmitComfyUi(workflowData) {
    let hasSeedInput = false;
    for (const nodeId in workflowData) {
      const node = workflowData[nodeId];
      if (node.class_type === "KSampler" && "seed" in node.inputs) {
        hasSeedInput = true;
        if (!seed) {
          const randomSeed =
            Math.floor(Math.random() * 999999999999999) + 1;
          node.inputs.seed = randomSeed;
        } else {
          node.inputs.seed = parseInt(seed, 10);
        }
        break;
      }
    }

    let imageIndex = 0;
    for (const nodeId in workflowData) {
      const node = workflowData[nodeId];
      if (node.class_type === "LoadImage" && node.inputs.image) {
        if (imageFiles[imageIndex]) {
          workflowData[nodeId].inputs.image = imageFiles[imageIndex].name;
        }
        imageIndex++;
      }
    }
    return workflowData;
  }

  function replaceModelData(workflowData) {
    // Iterate through each node in the workflow
    for (const nodeId in workflowData.nodes) {
      const node = workflowData.nodes[nodeId];
      
      // Check if node has model inputs
      if (node.data && node.data.inputs) {
        const inputs = node.data.inputs;
        
        // Check each input field that could contain a model
        for (const inputKey in inputs) {
          const input = inputs[inputKey];
          if (input && input.value && input.value.type) {
            // Get the model type from the value
            const modelType = input.value.type.toLowerCase();
            
            // Find matching model from selected models
            for (const [modelKey, selectedKey] of Object.entries(selectedModels)) {
              const selectedModel = availableModels.find(m => m.key === selectedKey);
              
              if (selectedModel && selectedModel.type.toLowerCase() === modelType) {
                // Replace model data
                input.value = {
                  key: selectedModel.key,
                  hash: selectedModel.hash,
                  name: selectedModel.name,
                  base: selectedModel.base,
                  type: selectedModel.type
                };
                break;
              }
            }
          }
        }
      }
    }
    return workflowData;
  }

  function handleSubmitInvokeAI(workflowData) {
    workflowData = replaceModelData(workflowData);
    console.log(workflowData);
    workflowData = generateJsonFormat(workflowData, "92113d53-e114-41c3-b767-f09fc654ccc3", "workflow", "gallery", "20f85f73-7dd9-4e27-8ce8-1e0b3b103374")
    return workflowData
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!gpuId || !workflowFile) {
      alert("Please fill in all fields.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let workflowData = JSON.parse(e.target.result);

        if(workflowType == "comfyui") {
          workflowData = handleSubmitComfyUi(workflowData);
        } else {
          workflowData =handleSubmitInvokeAI(workflowData);
        }

        const encodedImages = await Promise.all(
          imageFiles.map(async (file, index) => {
            try {
              const base64Image = await toBase64(file);
              return { name: file.name, image: base64Image };
            } catch (error) {
              console.error("Error encoding image:", error);
              return null;
            }
          }),
        );

        const payload = {
          input: {
            workflow: {
              nodes: workflowData,
              type: workflowType,
            },
            images: encodedImages,
          },
        };

        console.log(payload);

        const response = await axios.post(
          `https://api.runpod.ai/v2/${gpuId}/run`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${runpodApiKey}`, // Sử dụng runpodApiKey
              "Content-Type": "application/json",
            },
          },
        );

        const requestId = response.data.id;
        setStatus("Running...");

        const intervalId = setInterval(async () => {
          try {
            const statusResponse = await axios.get(
              `https://api.runpod.ai/v2/${gpuId}/status/${requestId}`,
              {
                headers: {
                  Authorization: `Bearer ${runpodApiKey}`,
                },
              },
            );

            setStatus(statusResponse.data.status.replace(/_/g, " "));

            if (statusResponse.data.status === "COMPLETED") {
              clearInterval(intervalId);
              const base64Result = statusResponse.data.output.message;
              setResultImage(`data:image/png;base64,${base64Result}`);
            }
          } catch (error) {
            clearInterval(intervalId);
            console.error("Error polling status:", error);
            setStatus("Error");
          }
        }, 3000);
      } catch (error) {
        console.error("Error parsing workflow JSON:", error);
        setStatus("Error");
      }
    };
    reader.readAsText(workflowFile);
  };

  const toBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
    });
  };
  const handleImageFileChange = (index, file) => {
    setImageFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      newFiles[index] = file;
      return newFiles;
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <form onSubmit={handleSubmit} className="workflow-form w-96 bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="runpodApiKey" className="block text-gray-700 font-bold mb-2">
            RunPod API Key:
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="runpodApiKey"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={runpodApiKey}
              onChange={handleRunpodApiKeyChange}
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                type="button"
                className="h-full px-3 text-gray-700 bg-gray-200 rounded-r" // Thêm bg-gray-200 và rounded-r
                onClick={handleTogglePasswordVisibility}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
          onClick={handleSaveApiKey}
        >
          Save API Key
        </button>
        <div className="mb-4">
          <label htmlFor="gpuId" className="block text-gray-700 font-bold mb-2">
            RunPod GPU ID:
          </label>
          <input
            type="text"
            id="gpuId"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={gpuId}
            onChange={handleGpuIdChange}
          />
        </div>
        <div className="mb-4 relative">
          <label htmlFor="workflowType" className="block text-gray-700 font-bold mb-2">
            Workflow Type:
          </label>
          <select
            id="workflowType"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline pr-8"
            value={workflowType}
            onChange={handleWorkflowTypeChange}
          >
            <option value="comfyui">ComfyUI</option>
            <option value="invokeai">InvokeAI</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="workflowFile" className="block text-gray-700 font-bold mb-2">
            Workflow JSON:
          </label>
          <input
            type="file"
            id="workflowFile"
            accept=".json"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            onChange={handleWorkflowFileChange}
          />
        </div>
        {/* Form chọn tệp hình ảnh */}
        {imageFiles.map((file, index) => (
          <div key={index} className="mb-4">
            <label htmlFor={`image-${index}`} className="block text-gray-700 font-bold mb-2">
              Choose image {index + 1}:
            </label>
            <input
              type="file"
              id={`image-${index}`}
              accept="image/*"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              onChange={(e) => handleImageFileChange(index, e.target.files[0])}
            />
          </div>
        ))}
        <div className="mb-4">
          <label htmlFor="seed" className="block text-gray-700 font-bold mb-2">
            Seed (optional):
          </label>
          <input
            type="text"
            id="seed"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={seed}
            onChange={handleSeedChange}
          />
        </div>
        {/* Model selection form for InvokeAI */}
        {workflowType === "invokeai" &&
          modelsToChoose.map((model, index) => (
            <div key={index} className="mb-4">
              <label htmlFor={`model-${index}`} className="block text-gray-700 font-bold mb-2">
                Choose {model.type} model:
              </label>
              <select
                id={`model-${index}`}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                onChange={(e) => handleModelSelection(model.key, e.target.value)}
              >
                <option value="">Select a model</option>
                {availableModels &&
                  Array.isArray(availableModels) &&
                  availableModels
                    .filter((m) => m.type === model.type)
                    .map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.name}
                      </option>
                    ))}
              </select>
            </div>
          ))}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Submit
        </button>
      </form>
      {status && <p className="text-gray-700 text-sm mt-4">{status}</p>}
      {resultImage && (
        <div className="result-image-container relative mt-6 inline-block">
          <img src={resultImage} alt="Result" className="result-image max-w-full h-auto rounded-lg shadow-md" />
          <a href={resultImage} download="result.png">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              aria-hidden="true"
              role="img"
              className="iconify iconify--ic download-icon absolute top-2 right-2 w-6 h-6 cursor-pointer"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10s10-4.49 10-10S17.51 2 12 2m-1 8V6h2v4h3l-4 4l-4-4zm6 7H7v-2h10z"></path>
            </svg>
          </a>
        </div>
      )}
    </main>
  );
}