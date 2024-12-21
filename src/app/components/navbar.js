"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const getLinkClass = (path) =>
    pathname === path
      ? "bg-blue-500 text-white" // Active link
      : "text-gray-300 hover:bg-gray-700 hover:text-white"; // Inactive link

  return (
    <nav className="bg-gray-800 p-4">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <Link href="/" className="text-white text-xl font-bold">
          AI Image Generator
        </Link>
        <div className="flex space-x-4">
          <Link
            href="/"
            className={`px-3 py-2 rounded-md text-sm font-medium transition duration-300 ${getLinkClass(
              "/"
            )}`}
          >
            Workflow
          </Link>
          <Link
            href="/modelsmanagement"
            className={`px-3 py-2 rounded-md text-sm font-medium transition duration-300 ${getLinkClass(
              "/modelsmanagement"
            )}`}
          >
            Install Models
          </Link>
          <Link
            href="/editorcomfy"
            className={`px-3 py-2 rounded-md text-sm font-medium transition duration-300 ${getLinkClass(
              "/editorcomfy"
            )}`}
          >
            Editor ComfyUI
          </Link>
        </div>
      </div>
    </nav>
  );
}