import {TMessageType} from "./typedef";

export default interface IToastStructParams {
    message: string
    type?: TMessageType
    duration?: number
}
