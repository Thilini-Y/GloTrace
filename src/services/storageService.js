export async function uploadProfileImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

    const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${API_KEY}`,
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    return data.data.url;
}