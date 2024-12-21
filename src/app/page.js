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

  const handleWorkflowFileChange = (e) => {
    setWorkflowFile(e.target.files[0]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflowData = JSON.parse(e.target.result);
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
      } catch (error) {
        console.error("Error parsing workflow JSON:", error);
      }
    };
    if (e.target.files[0]) {
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleSeedChange = (e) => {
    setSeed(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!gpuId || !workflowFile) {
      alert("Please fill in all fields.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workflowData = JSON.parse(e.target.result);

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
