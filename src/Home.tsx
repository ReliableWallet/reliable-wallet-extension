import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Flex } from "antd";

import "./css/home.css";

const buttonStyles = {
    background: "rgba(0, 0, 0, 0.2)",
};

// Главная страница
const WalletEntry: React.FC = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
        // console.log('Войти в кошелек');
        navigate("/login");
    };

    const handleCreateNewWallet = () => {
        // console.log('Создать новый кошелек');
        navigate("/create");
    };

    const test = () => {
        // console.log('test');
        navigate("/test");
    };

    return (
        <div className="container">
            <header className="header">
                <h1>Welcome to QURWAllet</h1>
            </header>

            <div className="body">
                <div className="content">
                    <p className="subText">Choose an option:</p>
                    <div className="buttonContainer">
                        <Flex vertical gap="small" style={{ width: "100%" }}>
                            <Button
                                className="customButton"
                                color="default"
                                variant="filled"
                                onClick={handleCreateNewWallet}
                                style={buttonStyles}
                                block
                            >
                                Create
                            </Button>
                            <Button
                                className="customButton"
                                color="default"
                                variant="filled"
                                onClick={handleLogin}
                                style={buttonStyles}
                                block
                            >
                                Log in
                            </Button>
                            <Button
                                className="customButton"
                                color="default"
                                variant="filled"
                                onClick={test}
                                style={buttonStyles}
                                block
                            >
                                test
                            </Button>
                        </Flex>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletEntry;
