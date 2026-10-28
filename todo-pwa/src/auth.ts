import { setAuth } from "./api.ts";
import {clearLocalData, ensureLocalOwner} from "./offline/db.ts";
import {unsubscribePush} from "./push.ts";


/**Guarda la sesion tas login/registro */
export async function startSession(token:string, userId: string) {
    localStorage.setItem("token", token);
    setAuth(token);
    await ensureLocalOwner(String(userId));

}

/**Cierra sesion se dejan de recibir notificaciones y se borran datos locales*/

export async function logout() {
    try{
        await unsubscribePush(); // necesita el token, por eso va antes de borrarlo
    }catch{

    }
    await clearLocalData();
    localStorage.removeItem("token");
    setAuth(null);
    window.location.href = "/";
}