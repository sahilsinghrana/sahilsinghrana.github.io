import Command from "@components/General/CodeBlock/Command";
import { links } from "@utils/constants";
import { Linkedin } from "lucide-solid";

const Heading = () => {
  return (
    <div class="heading">
      <img
        class="profileImage"
        src="https://placehold.co/600x400"
        alt="Sahil Singh Rana Image"
      />
      <div>
        <h3>
          <strong>Sahil Singh Rana</strong>
        </h3>
        <h4>Software Developer</h4>
        <Command text="npx namaste-sahil" />
        <a href={links.linkedin}>
          <Linkedin height={10} width={10} color="white" /> Connect
        </a>
      </div>
    </div>
  );
};

export default Heading;
