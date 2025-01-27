import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import QueryPage from "./components/Querypage/Querypage";
import LoginPage from "./components/login/login";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<LoginPage />}/>
        <Route path="/queryPage" element={<QueryPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
