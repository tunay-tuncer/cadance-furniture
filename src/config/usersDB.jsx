import furniture_db from "./supabaseClient";



// Insert new user to "users" table after login / signup if not exists
const addNewUser = async (userSession) => {
    const { data, error } = await furniture_db
        .from("users")
        .insert([{
            user_id: userSession.sub,
            email: userSession.email,
            username: userSession.nickname,
            profile_image: userSession.picture
        }])

    if (error) {
        console.log(error);
        return;
    }
}


// Check if user exist
const checkIfUserExist = async (userSession) => {
    const { data, error } = await furniture_db
        .from("users")
        .select()
        .eq("user_id", userSession.sub)
    
    if(error) {
        console.log(error);
        return;
    }

    if (data.length === 0) {
        addNewUser(userSession);
        location.reload();
    }
}


// Fetch existing user data from "users" table
const fetchUserData = async (userSession, setLoggedUserData) => {

    checkIfUserExist(userSession);

    const { data: userData, error: userError } = await furniture_db
        .from("users")
        .select()
        .eq("user_id", userSession?.sub)
        .single()

    if (userError) {
        console.log(userError);
        return;
    }

    if (userData) {
        setLoggedUserData({
            ...userData
        });
    }
}



export default { checkIfUserExist, addNewUser, fetchUserData }