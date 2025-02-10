"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function Editor() {
    const iframeRef = useRef(null);
    const [isComfyUIAvailable, setIsComfyUIAvailable] = useState(true);

    useEffect(() => {
        const checkComfyUIAvailability = async () => {
            try {
                const response = await fetch('http://127.0.0.1:8188', {
                    mode: 'no-cors' // Add no-cors mode to handle CORS issues
                });
                // Since no-cors returns opaque response, we can only detect if request was made
                setIsComfyUIAvailable(true);
            } catch (error) {
                setIsComfyUIAvailable(false);
            }
        };

        checkComfyUIAvailability();
        const interval = setInterval(checkComfyUIAvailability, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => {
                if (iframeRef.current) {
                    iframeRef.current.style.height = `${window.innerHeight}px`;
                }
            };
            window.addEventListener('resize', handleResize);
            handleResize();

            return () => window.removeEventListener('resize', handleResize);
        };
    }, []);

    if (!isComfyUIAvailable) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-0">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">ComfyUI is not running</h1>
                    <p>Please start ComfyUI on your local machine to use this feature.</p>
                    <p className="mt-2">Make sure ComfyUI is running on http://127.0.0.1:8188</p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-0">
            <iframe
                ref={iframeRef}
                src="http://127.0.0.1:8188/"
                width="100%"
                height="100vh"
                frameBorder="0"
                title="ComfyUI Editor"
            />
        </main>
    );
}