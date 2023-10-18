import ToastStruct from "./ToastStruct";
import IToastStructParams from "./IToastStructParams";

export default interface IUseToast {
    items: ToastStruct[]
    add: (toast: ToastStruct | IToastStructParams) => string
    error: (message: string) => string
    info: (message: string) => string
    success: (message: string) => string
    warning: (message: string) => string
    remove: (id: string) => void
    dismiss: (id: string) => void
}
