import { UnauthorizedError } from "@/errors/unauthorized-error";

import { prisma } from "@/lib/prisma";

import { hash } from "bcryptjs";

import type { FastifyInstance } from "fastify";

import type { ZodTypeProvider } from "fastify-type-provider-zod";

import z from "zod";

export async function resetPassword(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post("/password/reset", {
        schema: {
            tags: ["Auth"],
            summary: "Reset user password",
            body: z.object({
                code: z.string(),
                password: z.string().min(6)
            }),
            response: {
                204: z.null()
            }
        }
    }, async (request, reply) => {
        const { code, password } = request.body;

        const tokenFromCode = await prisma.token.findUnique({
            where: { id: code }
        })

        if (!tokenFromCode) {
            throw new UnauthorizedError();
        }

        const passwordHash = await hash(password, 6);

        await prisma.$transaction([
            prisma.member.update({
                where: {
                    id: tokenFromCode.memberId
                },

                data: { passwordHash }
            }),

            prisma.token.delete({
                where: { id: code }
            })
        ])

        return reply.status(204).send();
    })
}