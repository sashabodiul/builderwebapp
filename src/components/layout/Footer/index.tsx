import { FC } from 'react';
import {Link, useLocation} from "react-router-dom";
import pageRoutes from "../../../consts/pageRoutes.ts";
import styles from "./Footer.module.scss";
import classNames from "classnames";
import {Hammer, DollarSign, Settings, Route } from "lucide-react";
import LanguageSwitcher from "../LanguageSwitcher";

const Footer: FC = () => {
  const location = useLocation();

  const footerLinks = [
    {
      name: "Work",
      route: pageRoutes.WORK,
      icon: <Hammer />
    },
    {
      name: "Routes",
      route: pageRoutes.ROUTES,
      icon: <Route />
    },
    {
      name: "Salary",
      route: pageRoutes.SALARY,
      icon: <DollarSign />
    },
    {
      name: "Admin",
      route: pageRoutes.ADMIN,
      icon: <Settings />
    },
  ];

  return (
    <footer className={classNames(styles.footer, "bg-bg")}>
      <div className={styles.footerContent}>
        <nav className={styles.pageLinks}>
          {footerLinks.map((link, index) => (
            <Link
              key={index}
              className={classNames(styles.pageLink, location.pathname === link.route ? styles.active : "")}
              to={link.route}
            >
              { link.icon }
              <p>{link.name}</p>
            </Link>
          ))}
        </nav>
        <div className={styles.languageSwitcher}>
          <LanguageSwitcher/>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
