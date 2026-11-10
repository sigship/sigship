export const userRouter = router({
  byEmail: publicProcedure.input(z.object({ email: z.string() })).query(({ input }) => db.query(`SELECT * FROM users WHERE email = '${input.email}'`)),
});
