"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function Editor() {
    const iframeRef = useRef(null);
    const [isInvokeAIAvailable, setIsInvokeAIAvailable] = useState(true);

    useEffect(() => {
        const checkInvokeAIAvailability = async () => {
            try {
                const response = await fetch('http://127.0.0.1:9090', {
                    mode: 'no-cors' // Add no-cors mode to handle CORS issues
                });
                // Since no-cors returns opaque response, we can only detect if request was made
                setIsInvokeAIAvailable(true);
            } catch (error) {
                setIsInvokeAIAvailable(false);
            }
        };

        checkInvokeAIAvailability();
        const interval = setInterval(checkInvokeAIAvailability, 5000); // Check every 5 seconds

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

    if (!isInvokeAIAvailable) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-0">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">InvokeAI is not running</h1>
                    <p>Please start InvokeAI on your local machine to use this feature.</p>
                    <p className="mt-2">Make sure InvokeAI is running on http://127.0.0.1:9090</p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-0">
            <iframe
                ref={iframeRef}
                src="http://127.0.0.1:9090/"
                width="100%"
                height="100vh"
                frameBorder="0"
                title="InvokeAI Editor"
            />
        </main>
    );
}