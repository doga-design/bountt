import { useNavigate } from "react-router-dom";

export default function ComingSoon({ title = "Coming Soon" }: { title?: string }) {
  const navigate = useNavigate();

  return (
    <div className="screen-container bg-background items-center justify-center">
      <div className="text-center px-8">
        <h1 className="bountt-wordmark text-4xl text-foreground mb-2">
          bountt<span className="text-primary">.</span>
        </h1>
        <div className="bg-secondary text-secondary-foreground rounded-full px-5 py-2 text-sm font-bold inline-block mb-6">
          {title}
        </div>
        <p className="text-muted-foreground mb-8 text-sm">
          This feature is coming in the next phase. Stay tuned!
        </p>
        <button
          onClick={() => navigate(-1)}
          className="bg-primary text-primary-foreground rounded-full px-8 py-3 font-bold text-sm"
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
}
