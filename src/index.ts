import {reactive} from "vue";
// @ts-ignore
import cloneDeep from 'lodash.clonedeep'
import axios, {AxiosHeaders, AxiosRequestConfig, AxiosResponse, Method, RawAxiosRequestHeaders} from "axios";

type FormDataType = object;
type MethodsHeaders = Partial<{
    [Key in Method as Lowercase<Key>]: AxiosHeaders;
} & { common: AxiosHeaders }>;

type CallbackFunctionNoParams = () => void
type CallbackFunctionOneParam = (response: AxiosResponse<any, any>) => void

export interface RequestOptions {
    headers?: (RawAxiosRequestHeaders & MethodsHeaders) | AxiosHeaders;
    onError?: CallbackFunctionOneParam,
    onSuccess?: CallbackFunctionOneParam,
    onStart?: CallbackFunctionNoParams,
    onFinish?: CallbackFunctionNoParams,
}

interface UpFormProps<TForm extends FormDataType> {
    errors: Partial<Record<keyof TForm, string>>,
    hasErrors: boolean,
    processing: boolean,

    data(): TForm,

    clearErrors(...fields: (keyof TForm)[]): this

    setError(field: keyof TForm, value: string): this

    setError(errors: Record<keyof TForm, string>): this

    submit(method: Method, url: string, options?: Partial<RequestOptions>): void

    get(url: string, options?: Partial<RequestOptions>): void

    put(url: string, options?: Partial<RequestOptions>): void

    post(url: string, options?: Partial<RequestOptions>): void

    delete(url: string, options?: Partial<RequestOptions>): void

    options(url: string, options?: Partial<RequestOptions>): void
}

export type UpForm<TForm extends FormDataType> = TForm & UpFormProps<TForm>

export default function useForm<TForm extends FormDataType>(data: TForm | (() => TForm)): UpForm<TForm> {
    let defaults = typeof data === 'object' ? cloneDeep(data) : cloneDeep(data())
    const form = reactive({
        ...cloneDeep(defaults),
        hasErrors: false,
        processing: false,
        data(): TForm {
            return (Object.keys(defaults) as Array<keyof TForm>).reduce((carry, key) => {
                carry[key] = this[key]
                return carry
            }, {} as Partial<TForm>) as TForm
        },
        errors: {},
        setError(fieldOrFields: keyof TForm | Record<keyof TForm, string>, maybeValue?: string) {
            // console.log('SetError', fieldOrFields)
            Object.assign(this.errors, typeof fieldOrFields === 'string' ? {[fieldOrFields]: maybeValue} : fieldOrFields)

            this.hasErrors = Object.keys(this.errors).length > 0
            return this
        },
        clearErrors(...fields: any[]) {
            this.errors = Object.keys(this.errors).reduce(
                (carry, field) => ({
                    ...carry,
                    ...(fields.length > 0 && !fields.includes(field) ? {[field]: this.errors[field]} : {}),
                }),
                {},
            )

            this.hasErrors = Object.keys(this.errors).length > 0

            return this
        },
        submit(method: Method, url: string, options?: Partial<RequestOptions>) {
            // return new Promise(()=>{
            this.processing = true
            if (!!options?.onStart) {
                options.onStart()
            }

            const axiosOptions: Partial<AxiosRequestConfig<any>> = {}
            if (!!options?.headers) {
                axiosOptions.headers = options.headers
            }
            axiosOptions.method = method
            axiosOptions.url = url
            axiosOptions.data = this.data()

            console.log(axios.defaults)

            axios.request(axiosOptions)
                .then((response: AxiosResponse<any, any>): void => {
                    this.clearErrors()
                    // console.log(response)
                    if (!!options?.onSuccess) {
                        options.onSuccess(response)
                    }
                })
                .catch((error:any): void => {
                    const e: Event = new Event('__up_http_response_error')
                    // @ts-ignore
                    e.detail = {type: 'danger', message: error.response.data.message ?? error.response.message}
                    dispatchEvent(e)

                    const errResponse: any = error.response.data.errors
                    this.setError(errResponse)
                    if (!!options?.onError) {
                        options.onError(errResponse)
                    }
                })
                .finally((): void => {
                    this.processing = false
                    if (!!options?.onFinish) {
                        options.onFinish()
                    }
                })
            // })

        },
        get(url: string, options?: Partial<RequestOptions>) {
            this.submit('get', url, options)
        },
        put(url: string, options?: Partial<RequestOptions>) {
            this.submit('put', url, options)
        },
        post(url: string, options?: Partial<RequestOptions>) {
            this.submit('post', url, options)
        },
        delete(url: string, options?: Partial<RequestOptions>) {
            this.submit('delete', url, options)
        },
        options(url: string, options?: Partial<RequestOptions>) {
            this.submit('options', url, options)
        },
    })
    return form
}
