"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export const LAST_PATH_KEY = "dev_last_path";

export default function RouteTracker() {
    const pathname = usePathname();
    const prevRef = useRef("");

    useEffect(() => {
        // No primeiro mount: inicializa prevRef
        if (!prevRef.current) {
            prevRef.current = pathname;
            return;
        }

        // Quando muda de rota: grava a rota anterior ANTES de atualizar
        sessionStorage.setItem(LAST_PATH_KEY, prevRef.current);
        prevRef.current = pathname;
    }, [pathname]);

    return null;
}
