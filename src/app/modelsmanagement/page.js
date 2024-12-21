"use client";

import React, { useState } from "react";
import axios from "axios";

export default function ModelManagement() {
  const [gpuId, setGpuId] = useState("");
  const [modelUrls, setModelUrls] = useState("");
  const [installStatus, setInstallStatus] = useState("");
  const [modelsTree, setModelsTree] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [fetchStatus, setFetchStatus] = useState("");

  const handleModelUrlsChange = (e) => {
    setModelUrls(e.target.value);
  };

  const handleGpuIdChange = (e) => {
    setGpuId(e.target.value);
  };

  const installModels = async (e) => {
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
            Authorization:
              "Bearer ",
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
                Authorization:
                  "Bearer ",
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
    setFetchStatus("Fetching models tree...");
  
    try {
      const payload = {
        input: {
          get_models_tree: true,
        },
      };
  
      const response = await axios.post(
        `https://api.runpod.ai/v2/${gpuId}/run`,
        payload,
        {
          headers: {
            Authorization:
              "Bearer ",
            "Content-Type": "application/json",
          },
        },
      );
  
      const requestId = response.data.id; // Lấy requestId
      const intervalId = setInterval(async () => { // Sử dụng setInterval
        try {
          const statusResponse = await axios.get(
            `https://api.runpod.ai/v2/${gpuId}/status/${requestId}`,
            {
              headers: {
                Authorization:
                  "Bearer ",
              },
            },
          );
  
          // Cập nhật trạng thái fetch dựa trên trạng thái từ RunPod
          setFetchStatus("Fetching models: " + statusResponse.data.status.replace(/_/g, " "));
  
          if (statusResponse.data.status === "COMPLETED") { // Kiểm tra trạng thái "COMPLETED"
            clearInterval(intervalId);
            console.log(statusResponse.data.output.message);
            setModelsTree(statusResponse.data.output.message); // Lấy kết quả từ output
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
                  className={`pl-4 py-1 ${childIndex % 2 === 0 ? 'bg-gray-100' : ''
                    } truncate`}
                  title={child} // Thêm thuộc tính title để hiển thị tên đầy đủ khi hover
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
  return (
    <main className="flex min-h-screen items-start justify-center p-24">
      <div className="flex space-x-8">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6">Install Models</h2>
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
            Install
          </button>
          {installStatus && (
            <p className="text-gray-700 text-sm mt-4">{installStatus}</p>
          )}
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md w-96 overflow-y-auto"> {/* Thêm overflow-y-auto */}
          <h2 className="text-2xl font-bold mb-6">Models Tree</h2>
          <button
            onClick={fetchModelsTree}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
          >
            Fetch Models Tree
          </button>
          {fetchStatus && ( // Hiển thị trạng thái fetch
            <p className="text-gray-700 text-sm mb-4">{fetchStatus}</p>
          )}
          <div className="folder-tree"> {/* Thêm container cho folder tree */}
            {modelsTree && renderFolderTree(modelsTree)}
          </div>
        </div>
      </div>
    </main>
  );
}