import { Copy } from "lucide-solid";
import "./index.scss";

let copyTimeout;

const Command = ({
  text,
  textToCopy,
}: {
  text: string;
  textToCopy?: string;
}) => {
  console.log("Holla");
  return (
    <p class={"codeblock-command"}>
      <code>{text}</code>
      <button
        data-copying="false"
        onclick={(e) => {
          console.log("av");
        }}
        type="button"
      >
        <Copy height={20} width={20} />
      </button>
    </p>
  );
};

export default Command;
