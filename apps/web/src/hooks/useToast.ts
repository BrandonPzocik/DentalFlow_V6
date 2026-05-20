import { toast } from 'sonner';

export function useToast() {
  return {
    success: (msg: string, description?: string) => toast.success(msg, { description }),
    error:   (msg: string, description?: string) => toast.error(msg,   { description }),
    info:    (msg: string, description?: string) => toast.info(msg,    { description }),
    warning: (msg: string, description?: string) => toast.warning(msg, { description }),
    loading: (msg: string) => toast.loading(msg),
    dismiss: (id?: string | number) => toast.dismiss(id),
    promise: <T,>(p: Promise<T>, msgs: { loading: string; success: string; error: string }) =>
      toast.promise(p, msgs),
  };
}
