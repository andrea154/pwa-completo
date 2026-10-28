import axios from "axios";
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 15_000, //para que no deje una conexion colgada
});

export function setAuth(token: string | null) {
    if (token) api.defaults.headers.common["Authorization"] =  `Bearer ${token}`;
    else delete api.defaults.headers.common["Authorization"];
}

//Set Inicial
setAuth(localStorage.getItem("token"));
//si el token expira, se elimina del localStorage y de los headers
api.interceptors.response.use(
    (r) => r,
    (err) => {
        const url: string = err.config?.url ?? "";
        if (err.response?.status === 401 && !url.startsWith("/auth")) {
            localStorage.removeItem("token");
            setAuth(null);
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);
/**Mensaje que muestre cual fue el error*/
export function errorMessage(err: unknown, fallback = "Ocurrio un error bb"){
    if(axios.isAxiosError(err)){
        if(!err.response) return "Sin conexion con el servidor";
        return(err.response.data as {message?: string})?.message ?? fallback;
    }
    return err instanceof Error ? err.message : fallback;
}