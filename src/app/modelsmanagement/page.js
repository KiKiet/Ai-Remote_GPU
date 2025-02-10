"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ModelManagement() {
  const [gpuId, setGpuId] = useState("");
  const [modelUrls, setModelUrls] = useState("");
  const [installStatus, setInstallStatus] = useState("");
  const [modelsTree, setModelsTree] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [fetchStatus, setFetchStatus] = useState("");

  const [invokeName, setInvokeName] = useState("");
  const [invokeDescription, setInvokeDescription] = useState("");
  const [invokeAccessToken, setInvokeAccessToken] = useState("");
  const [invokeUrl, setInvokeUrl] = useState("");
  const [invokeStatus, setInvokeStatus] = useState("");

  const [monitoringData, setMonitoringData] = useState(null); // State for monitoring data
  const [monitoringStatus, setMonitoringStatus] = useState(""); // State for monitoring status

  const handleModelUrlsChange = (e) => {
    setModelUrls(e.target.value);
  };

  const handleGpuIdChange = (e) => {
    setGpuId(e.target.value);
  };

  const checkGpuId = async () => {
    if (!gpuId) {
      alert("Please enter a valid GPU ID");
      return false;
    }
    return true;
  };

  const installModels = async (e) => {
    if (!checkGpuId()) {
      return;
    }
    setInstallStatus("Installing models...");

    try {
      const payload = {
        input: {
          model_urls: modelUrls.split("\n").filter(Boolean),
        },
      };

      const response = await axios.post(
        `https://api.runpod.ai/v2/${gpuId}/run`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("runpodApiKey")}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log(response);

      const requestId = response.data.id;
      const intervalId = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `https://api.runpod.ai/v2/${gpuId}/status/${requestId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("runpodApiKey")}`,
              },
            },
          );

          setInstallStatus(
            "Installing models: " +
              statusResponse.data.status.replace(/_/g, " "),
          );

          if (statusResponse.data.status === "success") {
            clearInterval(intervalId);
            setInstallStatus("Models installed successfully!");
          }
        } catch (error) {
          clearInterval(intervalId);
          console.error("Error polling install status:", error);
          setInstallStatus("Error installing models");
        }
      }, 3000);
    } catch (error) {
      console.error("Error installing models:", error);
      setInstallStatus("Error installing models");
    }
  };

  const fetchModelsTree = async () => {
    if (!checkGpuId()) {
      return;
    }
    setFetchStatus("Fetching models tree...");

    try {
      const payload = {
        input: {
          get_models_tree_comfyui: true,
        },
      };

      const response = await axios.post(
        `https://api.runpod.ai/v2/${gpuId}/run`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("runpodApiKey")}`,
            "Content-Type": "application/json",
          },
        },
      );

      const requestId = response.data.id;
      const intervalId = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `https://api.runpod.ai/v2/${gpuId}/status/${requestId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("runpodApiKey")}`,
              },
            },
          );

          setFetchStatus(
            "Fetching models: " + statusResponse.data.status.replace(/_/g, " "),
          );

          if (statusResponse.data.status === "COMPLETED") {
            clearInterval(intervalId);
            console.log(statusResponse.data.output.message);
            setModelsTree(statusResponse.data.output.message);
            setFetchStatus("Models tree fetched successfully!");
          }
        } catch (error) {
          clearInterval(intervalId);
          console.error("Error polling fetch status:", error);
          setFetchStatus("Error fetching models tree");
        }
      }, 3000);
    } catch (error) {
      console.error("Error fetching models tree:", error);
      setFetchStatus("Error fetching models tree");
    }
  };

  const handleFolderClick = (folderName) => {
    setExpandedFolders((prevExpandedFolders) => ({
      ...prevExpandedFolders,
      [folderName]: !prevExpandedFolders[folderName],
    }));
  };

  const renderFolderTree = (tree, level = 0) => {
    return Object.entries(tree).map(([folderName, children], index) => (
      <div key={folderName}>
        <div
          className="cursor-pointer hover:bg-gray-200 pl-4"
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => handleFolderClick(folderName)}
        >
          <span className="flex items-center">
            {expandedFolders[folderName] ? "▼" : "▶"} {folderName}
          </span>
        </div>
        {expandedFolders[folderName] && (
          <div>
            {Array.isArray(children) ? (
              <ul className="border-l border-gray-300 ml-4">
                {children.map((child, childIndex) => (
                  <li
                    key={child}
                    className={`pl-4 py-1 ${
                      childIndex % 2 === 0 ? "bg-gray-100" : ""
                    } truncate`}
                    title={child}
                  >
                    {child}
                  </li>
                ))}
              </ul>
            ) : (
              renderFolderTree(children, level + 1)
            )}
          </div>
        )}
      </div>
    ));
  };

  const invokeInstallModel = async () => {
    if (!checkGpuId()) {
      return;
    }
    setInvokeStatus("Installing Invoke AI model...");
    try {
      const payload = {
        input: {
          invoke_model: {
            name: invokeName,
            description: invokeDescription || undefined,
            access_token: invokeAccessToken || undefined,
            url: invokeUrl,
          },
        },
      };

      const response = await axios.post(
        `https://api.runpod.ai/v2/${gpuId}/run`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("runpodApiKey")}`,
            "Content-Type": "application/json",
          },
        },
      );

      const requestId = response.data.id;
      const intervalId = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `https://api.runpod.ai/v2/${gpuId}/status/${requestId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("runpodApiKey")}`,
              },
            },
          );

          setInvokeStatus(
            "Installing Invoke AI model: " +
              statusResponse.data.status.replace(/_/g, " "),
          );

          if (statusResponse.data.status === "success") {
            clearInterval(intervalId);
            setInvokeStatus("Invoke AI model installed successfully!");
            fetchMonitoringData();
          }
        } catch (error) {
          clearInterval(intervalId);
          console.error("Error polling install status:", error);
          setInvokeStatus("Error installing Invoke AI model");
        }
      }, 3000);
    } catch (error) {
      console.error("Error installing Invoke AI model:", error);
      setInvokeStatus("Error installing Invoke AI model");
    }
  };

  // Function to fetch monitoring data
  const fetchMonitoringData = async () => {
    if (!checkGpuId()) {
      return;
    }
    setMonitoringStatus("Fetching download progress...");
    try {
      const payload = {
        input: {
          get_invoke_models_download_list: true,
        },
      };

      const response = await axios.post(
        `https://api.runpod.ai/v2/${gpuId}/run`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("runpodApiKey")}`,
            "Content-Type": "application/json",
          },
        },
      );

      const requestId = response.data.id;
      const intervalId = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `https://api.runpod.ai/v2/${gpuId}/status/${requestId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("runpodApiKey")}`,
              },
            },
          );

          if (statusResponse.data.status === "COMPLETED") {
            clearInterval(intervalId);
            setMonitoringData(statusResponse.data.output);
            setMonitoringStatus("Download progress fetched successfully!");
          } else {
            setMonitoringStatus(
              "Fetching download progress: " +
                statusResponse.data.status.replace(/_/g, " "),
            );
          }
        } catch (error) {
          clearInterval(intervalId);
          console.error("Error polling monitoring status:", error);
          setMonitoringStatus("Error fetching download progress");
        }
      }, 3000);
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
      setMonitoringStatus("Error fetching download progress");
    }
  };

  // Automatically fetch monitoring data when the component mounts
  /*useEffect(() => {
    fetchMonitoringData();
  }, []);*/

  return (
    <main className="flex min-h-screen flex-col items-center p-12">
      <h1 className="text-3xl font-bold mb-8">Models Management</h1>
      
      <div className="grid grid-cols-2 gap-8 w-full max-w-6xl">
        {/* GPU ID Input - Shared across all panels */}
        <div className="col-span-2 bg-white p-6 rounded-lg shadow-md">
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

        {/* ComfyUI Model Installation */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">ComfyUI Models</h2>
          <div className="mb-4">
            <label htmlFor="modelUrls" className="block text-gray-700 font-bold mb-2">
              Model Install Prompts:
            </label>
            <textarea
              id="modelUrls"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-40"
              value={modelUrls}
              onChange={handleModelUrlsChange}
            />
          </div>
          <button
            onClick={installModels}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Install Models
          </button>
          {installStatus && (
            <p className="text-gray-700 text-sm mt-4">{installStatus}</p>
          )}
        </div>

        {/* Models Tree */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Models Tree</h2>
          <button
            onClick={fetchModelsTree}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
          >
            Refresh Models Tree
          </button>
          {fetchStatus && (
            <p className="text-gray-700 text-sm mb-4">{fetchStatus}</p>
          )}
          <div className="folder-tree max-h-[400px] overflow-y-auto">
            {modelsTree && renderFolderTree(modelsTree)}
          </div>
        </div>

        {/* InvokeAI Model Installation */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">InvokeAI Models</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="invokeName" className="block text-gray-700 font-bold mb-2">
                Name (Required):
              </label>
              <input
                type="text"
                id="invokeName"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                value={invokeName}
                onChange={(e) => setInvokeName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="invokeDescription" className="block text-gray-700 font-bold mb-2">
                Description (Optional):
              </label>
              <input
                type="text"
                id="invokeDescription"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                value={invokeDescription}
                onChange={(e) => setInvokeDescription(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="invokeAccessToken" className="block text-gray-700 font-bold mb-2">
                Access Token (Optional):
              </label>
              <input
                type="text"
                id="invokeAccessToken"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                value={invokeAccessToken}
                onChange={(e) => setInvokeAccessToken(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="invokeUrl" className="block text-gray-700 font-bold mb-2">
                URL (Required):
              </label>
              <input
                type="text"
                id="invokeUrl"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                value={invokeUrl}
                onChange={(e) => setInvokeUrl(e.target.value)}
              />
            </div>
            <button
              onClick={invokeInstallModel}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
            >
              Install Model
            </button>
            {invokeStatus && (
              <p className="text-gray-700 text-sm mt-4">{invokeStatus}</p>
            )}
          </div>
        </div>

        {/* Download Progress Monitor */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Download Progress</h2>
          <button
            onClick={fetchMonitoringData}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4 w-full"
          >
            Refresh Progress
          </button>
          {monitoringStatus && (
            <p className="text-gray-700 text-sm mb-4">{monitoringStatus}</p>
          )}
          <div className="max-h-[300px] overflow-y-auto">
            {monitoringData ? (
              <div className="space-y-4">
                {monitoringData.data.map((model, index) => (
                  <div key={index} className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">ID: {model.id}</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        model.status === 'completed' ? 'bg-green-200 text-green-800' :
                        model.status === 'error' ? 'bg-red-200 text-red-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                        {model.status}
                      </span>
                    </div>
                    
                    {model.bytes && model.total_bytes && (
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{width: `${(model.bytes / model.total_bytes * 100)}%`}}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {Math.round(model.bytes / 1024 / 1024)}MB / {Math.round(model.total_bytes / 1024 / 1024)}MB
                        </div>
                      </div>
                    )}

                    {model.local_path && (
                      <div className="text-sm text-gray-600">
                        Path: {model.local_path}
                      </div>
                    )}

                    {model.error_reason && (
                      <div className="text-sm text-red-600 mt-2">
                        Error: {model.error_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 text-sm">No monitoring data available.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}