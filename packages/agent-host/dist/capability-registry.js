export function createAgentHostCapabilityRegistry(registrations) {
    const byName = new Map();
    for (const registration of registrations) {
        const name = registration.descriptor.name.trim();
        if (!name)
            throw new Error("Host capability name is required.");
        if (byName.has(name))
            throw new Error(`Host capability "${name}" is registered more than once.`);
        byName.set(name, registration);
    }
    const descriptors = [...byName.values()]
        .map((registration) => registration.descriptor)
        .sort((left, right) => left.name.localeCompare(right.name));
    return {
        list: () => descriptors,
        async invoke(name, input, context) {
            const registration = byName.get(name);
            if (!registration)
                throw new AgentHostCapabilityNotFoundError(name);
            if (!isRecord(input) || registration.validate && !registration.validate(input)) {
                throw new AgentHostCapabilityInputError(name);
            }
            return registration.invoke(input, context);
        },
    };
}
export class AgentHostCapabilityNotFoundError extends Error {
    capability;
    constructor(capability) {
        super(`Host capability "${capability}" is not registered.`);
        this.capability = capability;
        this.name = "AgentHostCapabilityNotFoundError";
    }
}
export class AgentHostCapabilityInputError extends Error {
    capability;
    constructor(capability) {
        super(`Host capability "${capability}" received invalid input.`);
        this.capability = capability;
        this.name = "AgentHostCapabilityInputError";
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=capability-registry.js.map