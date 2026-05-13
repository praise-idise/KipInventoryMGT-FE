import { useEffect, useMemo, useState } from "react";
import type { ResendVerificationStatus } from "@/services/auth.service";

const STORAGE_KEY = "kip.auth.resend-verification-cooldowns";

type CooldownMap = Record<string, string>;

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function readCooldownMap(): CooldownMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as CooldownMap;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeCooldownMap(map: CooldownMap) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function getRemainingSeconds(nextAllowedAt: string | null) {
  if (!nextAllowedAt) {
    return 0;
  }

  const remainingMs = new Date(nextAllowedAt).getTime() - Date.now();
  if (Number.isNaN(remainingMs) || remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
}

function loadCooldown(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const map = readCooldownMap();
  const nextAllowedAt = map[normalizedEmail] ?? null;
  if (!nextAllowedAt) {
    return null;
  }

  if (getRemainingSeconds(nextAllowedAt) <= 0) {
    delete map[normalizedEmail];
    writeCooldownMap(map);
    return null;
  }

  return nextAllowedAt;
}

function saveCooldown(email: string, nextAllowedAt: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return;
  }

  const map = readCooldownMap();
  map[normalizedEmail] = nextAllowedAt;
  writeCooldownMap(map);
}

export function formatCooldown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function useResendVerificationCooldown(
  email: string | null | undefined,
) {
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const [nextAllowedAt, setNextAllowedAt] = useState<string | null>(() =>
    loadCooldown(email),
  );
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(loadCooldown(email)),
  );

  useEffect(() => {
    const storedCooldown = loadCooldown(normalizedEmail);
    setNextAllowedAt(storedCooldown);
    setRemainingSeconds(getRemainingSeconds(storedCooldown));
  }, [normalizedEmail]);

  useEffect(() => {
    if (!normalizedEmail || !nextAllowedAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemainingSeconds = () => {
      const nextRemainingSeconds = getRemainingSeconds(nextAllowedAt);
      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds <= 0) {
        const map = readCooldownMap();
        delete map[normalizedEmail];
        writeCooldownMap(map);
        setNextAllowedAt(null);
      }
    };

    updateRemainingSeconds();

    const intervalId = window.setInterval(updateRemainingSeconds, 1000);
    return () => window.clearInterval(intervalId);
  }, [normalizedEmail, nextAllowedAt]);

  function applyCooldown(
    status: ResendVerificationStatus,
    targetEmail?: string | null,
  ) {
    const effectiveEmail = normalizeEmail(targetEmail ?? normalizedEmail);
    if (!effectiveEmail) {
      return;
    }

    saveCooldown(effectiveEmail, status.nextAllowedAt);
    if (effectiveEmail === normalizedEmail) {
      setNextAllowedAt(status.nextAllowedAt);
      setRemainingSeconds(getRemainingSeconds(status.nextAllowedAt));
    }
  }

  return {
    remainingSeconds,
    isCoolingDown: remainingSeconds > 0,
    applyCooldown,
  };
}
