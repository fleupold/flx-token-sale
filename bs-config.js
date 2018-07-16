module.exports = {
    port: process.env.PORT,
    files: ['./**/*.{html,htm,css,js,json}'],
    server:{
        baseDir: ["./src", "./build/contracts"]
    }
};
