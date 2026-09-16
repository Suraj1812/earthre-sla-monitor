"use client";

import { CheckCircle, ErrorOutlined, InfoOutlined, WarningAmber } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { toast as notify, ToastContainer } from "react-toastify";
import type { IconProps, Id } from "react-toastify";

type AppToastOptions = { description?: string; id?: Id };

function content(title: string, description?: string) {
  return <div className="earthre-toast__content"><strong className="earthre-toast__title">{title}</strong>{description && <span className="earthre-toast__description">{description}</span>}</div>;
}

function toastIcon({ type, isLoading }: IconProps) {
  if (isLoading) return <CircularProgress size={20} thickness={4} sx={{ color: "#168b6d" }} />;
  if (type === "success") return <CheckCircle sx={{ color: "#168b6d" }} />;
  if (type === "error") return <ErrorOutlined sx={{ color: "#c93737" }} />;
  if (type === "warning") return <WarningAmber sx={{ color: "#b66a00" }} />;
  return <InfoOutlined sx={{ color: "#1e6a9e" }} />;
}

export const toast = {
  success: (title: string, options?: AppToastOptions) => options?.id !== undefined
    ? (notify.dismiss(options.id), notify.success(content(title, options.description)))
    : notify.success(content(title, options?.description)),
  error: (title: string, options?: AppToastOptions) => options?.id !== undefined
    ? (notify.dismiss(options.id), notify.error(content(title, options.description)))
    : notify.error(content(title, options?.description)),
  loading: (title: string, options?: AppToastOptions) => notify.loading(content(title, options?.description), { toastId: options?.id }),
};

export function Toasts() {
  return <ToastContainer
    position="top-right"
    autoClose={5000}
    newestOnTop
    closeOnClick
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="light"
    hideProgressBar
    icon={toastIcon}
    className="earthre-toasts"
    toastClassName="earthre-toast"
    bodyClassName="earthre-toast__body"
    progressClassName="earthre-toast__progress"
  />;
}
