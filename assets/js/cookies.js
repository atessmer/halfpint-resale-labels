/*
 * Cookie handlers.
 * source: https://www.quirksmode.org/js/cookies.html
 */
const createCookie = (name, value) => {
   document.cookie = `${name}=${value}; path=/`;
}

const readCookie = (name) => {
   const cookies = document.cookie.split(";");
   for (const cookie of cookies) {
      const [cookie_name, cookie_value] = cookie.trim().split("=");
      if (cookie_name == name) {
         return cookie_value;
      }
   }
   return null;
}

export {
   createCookie,
   readCookie,
};
