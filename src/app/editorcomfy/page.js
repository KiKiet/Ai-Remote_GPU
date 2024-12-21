"use client";

import React, { useEffect, useRef } from 'react';

export default function Editor() {
    const iframeRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => {
                if (iframeRef.current) {
                    iframeRef.current.style.height = `${window.innerHeight}px`; // Set height to window height
                }
            };
            window.addEventListener('resize', handleResize);
            handleResize(); // Initial resize

            return () => window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-0"> {/* Remove padding */}
            <iframe
                ref={iframeRef}
                src="http://127.0.0.1:8188/"
                width="100%"
                height="100vh"  // Set initial height to viewport height
                frameBorder="0"
                title="ComfyUI Editor"
            />
        </main>
    );
}