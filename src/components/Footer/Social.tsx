import {
  Github as GithubIcon,
  Linkedin,
  Twitter,
  Instagram,
  Mail,
} from 'lucide-solid';

const Social = () => {
  return (
    <div class="social">
      <ul>
        <li>
          <a href="https://github.com/sahilsinghrana">
            <GithubIcon />
          </a>
        </li>
        <li>
          <a href="https://github.com/sahilsinghrana">
            <Linkedin />
          </a>
        </li>
        <li>
          <a href="https://github.com/sahilsinghrana">
            <Twitter />
          </a>
        </li>
        <li>
          <a href="https://github.com/sahilsinghrana">
            <Instagram />
          </a>
        </li>
        <li>
          <a href="https://github.com/sahilsinghrana">
            <Mail />
          </a>
        </li>
      </ul>
    </div>
  );
};

export default Social;
