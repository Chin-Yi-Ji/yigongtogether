import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeTag(input: string): string {
  return input
    .trim()
    .replace(/^#+/, '') // 移除開頭的 #
    .replace(/\s+/g, '') // 移除空白
    .toLowerCase()
    .replace(/[^a-z0-9\-_\u4e00-\u9fff]/g, '') // 英數字、-、_、中文
}

export function formatHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-_]/g, '')
    .slice(0, 30) // 限制長度
}
