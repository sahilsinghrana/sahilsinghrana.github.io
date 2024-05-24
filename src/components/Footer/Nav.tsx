import { links } from "@utils/constants.ts";

const Nav = () => {
  return (
    <nav>
      <ul>
        <li>
          <a class="footerNavLink" href={links.about}>
            About
          </a>
        </li>
        <li>
          <a class="footerNavLink" href={links.contact}>
            Contact
          </a>
        </li>
        <li>
          <a class="footerNavLink" href={links.projects}>
            Projects
          </a>
        </li>
        <li>
          <a class="footerNavLink" href={links.blog}>
            Blog
          </a>
        </li>
      </ul>
    </nav>
  );
};

export default Nav;
