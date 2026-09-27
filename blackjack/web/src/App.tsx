import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Table from "./pages/Table";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/t/:code" element={<Table />} />
    </Routes>
  );
}
