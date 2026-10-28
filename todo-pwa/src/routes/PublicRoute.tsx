import type {ReactNode} from "react";
import { Navigate } from "react-router-dom";

export default function PublicRoute({children}:{children: ReactNode}){

    return localStorage.getItem("token") ?  <Navigate to ="/dashboard" replace/> : <>{children}</>;
}