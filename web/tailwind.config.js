export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#ef4444', // red-500
                    hover: '#f43f5e', // rose-500
                },
                secondary: {
                    DEFAULT: '#ec4899', // pink-500
                },
                accent: {
                    DEFAULT: '#8b5cf6', // violet-500
                }
            },
            animation: {
                'mesh-gradient': 'mesh-gradient 10s ease infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                'mesh-gradient': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                }
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}

