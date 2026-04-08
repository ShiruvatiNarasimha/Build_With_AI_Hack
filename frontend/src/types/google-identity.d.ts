export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          cancel: () => void;
          disableAutoSelect: () => void;
          initialize: (options: {
            auto_select?: boolean;
            callback: (response: { credential?: string }) => void;
            client_id: string;
            itp_support?: boolean;
            use_fedcm_for_prompt?: boolean;
            ux_mode?: "popup" | "redirect";
          }) => void;
          prompt: () => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              locale?: string;
              logo_alignment?: "center" | "left";
              shape?: "circle" | "pill" | "rectangular" | "square";
              size?: "large" | "medium" | "small";
              text?:
                | "continue_with"
                | "signin"
                | "signin_with"
                | "signup_with";
              theme?: "filled_black" | "filled_blue" | "outline";
              type?: "icon" | "standard";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}
