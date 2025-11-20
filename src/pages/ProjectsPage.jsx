import React, { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react';

// Styles
import styles from "../styles/page_styles/projectsPage_styles/ProjectsPage.module.scss";

// Wrappers
import PageWrapper from '../wrappers/PageWrapper';


const ProjectsPage = () => {

    const { user, isAuthenticated } = useAuth0();

    const [projectsList, setprojectsList] = useState([
        { projectName: "Şahika Hanım", furnitureCount: 2, totalPrice: 150000, color: "blue" },
        { projectName: "Iraz Hanım", furnitureCount: 5, totalPrice: 20000, color: "red" },
        { projectName: "Arif Bey", furnitureCount: 1, totalPrice: 450000, color: "green" }
    ])

    return (
        <PageWrapper>
            {/* ProjectsPage */}
            {/* {isAuthenticated && <p>{JSON.stringify(user)}</p>} */}

            <h1>PROJECTS</h1>

            <ul className={styles.projectsMainContainer}>
                {projectsList.map((project, id) => (
                    <li key={id} className={styles.projectContainer}>
                        <div className={styles.clientNameDiv}>
                            <p className={styles.descriptionText}>Müşteri</p>
                            <p>{project.projectName}</p>
                        </div>
                        <div className={styles.furnitureCountDiv}>
                            <p className={styles.descriptionText}>Mobilya Sayısı</p>
                            <p>{project.furnitureCount}</p>
                        </div>
                        <div className={styles.totalPriceDiv}>
                            <p className={styles.descriptionText}>Total Maliyet</p>
                            <p>{project.totalPrice}</p>
                        </div>
                    </li>
                ))}

                <li className={styles.projectContainer}>Add Project</li>
            </ul>

        </PageWrapper>
    );
}

export default ProjectsPage;