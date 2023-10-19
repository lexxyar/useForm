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
    baseUrl?: string | null
    headers?: (RawAxiosRequestHeaders & MethodsHeaders) | AxiosHeaders
    onError?: CallbackFunctionOneParam
    onSuccess?: CallbackFunctionOneParam
    onStart?: CallbackFunctionNoParams
    onFinish?: CallbackFunctionNoParams
}

interface UpFormProps<TForm extends FormDataType> {
    errors: Partial<Record<keyof TForm, string>>,
    hasErrors: boolean,
    processing: boolean,

    data(): TForm,

    defaults(): this

    defaults(field: keyof TForm, value: FormDataConvertible): this

    defaults(fields: Partial<TForm>): this

    transform(callback: (data: TForm) => object): this

    reset(...fields: (keyof TForm)[]): this

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
export type FormDataConvertible =
    | Array<FormDataConvertible>
    | { [key: string]: FormDataConvertible }
    | Blob
    | FormDataEntryValue
    | Date
    | boolean
    | number
    | null
    | undefined

export default function useForm<TForm extends FormDataType>(data: TForm | (() => TForm)): UpForm<TForm> {
    let defaults = typeof data === 'object' ? cloneDeep(data) : cloneDeep(data())
    let transform = (data: any) => data
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
        defaults(fieldOrFields?: keyof TForm | Partial<TForm>, maybeValue?: FormDataConvertible) {
            if (typeof data === 'function') {
                throw new Error('You cannot call `defaults()` when using a function to define your form data.')
            }

            if (typeof fieldOrFields === 'undefined') {
                defaults = this.data()
            } else {
                defaults = Object.assign(
                    {},
                    cloneDeep(defaults),
                    typeof fieldOrFields === 'string' ? {[fieldOrFields]: maybeValue} : fieldOrFields,
                )
            }

            return this
        },
        reset(...fields: any[]) {
            const resolvedData = typeof data === 'object' ? cloneDeep(defaults) : cloneDeep(data())
            const clonedData = cloneDeep(resolvedData)
            if (fields.length === 0) {
                defaults = clonedData
                Object.assign(this, resolvedData)
            } else {
                Object.keys(resolvedData)
                    .filter((key) => fields.includes(key))
                    .forEach((key) => {
                        defaults[key] = clonedData[key]
                        this[key] = resolvedData[key]
                    })
            }

            return this
        },
        transform(callback: (data: TForm) => object) {
            transform = callback

            return this
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
            if (options?.baseUrl) {
                axios.defaults.baseURL = options.baseUrl
            }

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

            // // @ts-ignore
            // if (window.up?.axios?.baseURL) {
            //     // @ts-ignore
            //     axios.defaults.baseURL = window.up.axios.baseURL
            // }

            this.clearErrors()

            axios.request(axiosOptions)
                .then((response: AxiosResponse<any, any>): void => {
                    if (!!options?.onSuccess) {
                        options.onSuccess(response)
                    }
                })
                .catch((error: any): void => {
                    const e: Event = new Event('__up_http_response_error')
                    // @ts-ignore
                    e.detail = {type: 'danger', message: error.response.data.message ?? error.response.message}
                    dispatchEvent(e)

                    const errResponse: any = error.response.data.errors
                    this.setError(errResponse)
                    if (!!options?.onError) {
                        options.onError(error.response)
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
