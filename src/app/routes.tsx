import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChatMain from "./pages/ChatMain";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Login /> },
      { path: "signup", element: <Signup /> },
      { path: "chat", element: <ChatMain /> },
    ],
  },
]);
