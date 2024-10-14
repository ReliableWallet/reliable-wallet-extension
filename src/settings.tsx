import React from "react";
import { useNavigate } from 'react-router-dom';
import { FaArrowLeftLong } from "react-icons/fa6";
import IconButton from "./libs/IconButton";

// import './css/icons.css';


const Settings: React.FC = () => {

    const navigate = useNavigate();


    return (
        <div className="container">
            <header className="header">
                <IconButton className="back-icon" style={{}} icon={<FaArrowLeftLong style={{ fill: 'pink' }} size={24} />} onClick={() => navigate(-1)} />
            </header>

            <div className="body">
                <div className="content">
                    <h1>SOON</h1>
                </div>
            </div>
        </div>
    );
}

export default Settings