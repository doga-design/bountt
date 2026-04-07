import { useNavigate } from "react-router-dom";
import { Plus, TicketCheck } from "lucide-react";

export default function EmptyGroups() {
  const navigate = useNavigate();

  return (
    <div className="screen-container bg-background items-center justify-center">
      <div className="text-center px-8">
        <h1 className="bountt-wordmark text-4xl text-foreground mb-2">
          bountt<span className="text-primary">.</span>
        </h1>

        <p className="text-lg font-semibold text-foreground mt-8 mb-1">
          You're not in any groups yet
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Create a new group or join an existing one
        </p>

        <div className="space-y-3 w-full">
          <button
            onClick={() => navigate("/onboarding/group-name")}
            className="w-full bg-primary text-primary-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create New Group
          </button>
          <button
            onClick={() => navigate("/join")}
            className="w-full bg-muted text-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2"
          >
            <TicketCheck className="w-5 h-5" /> Join via Invite Code
          </button>
        </div>
      </div>
    </div>
  );
}
