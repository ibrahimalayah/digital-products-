import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { badRequest } from "@/lib/errors";
import { newId } from "@/lib/utils";
import type { Block, ProductOutline, ProductSection } from "@/lib/types";
import type { CurrentUser } from "@/lib/session";

// A finished, hand-edited product that ships with the platform so a new store
// has something real to sell on day one. Chosen for the season: planners and
// budget trackers are the steadiest digital sellers, and demand peaks from late
// November into January.

const p = (text: string): Block => ({ type: "paragraph", title: "", text, items: [] });
const steps = (title: string, items: string[]): Block => ({ type: "steps", title, text: "", items });
const checklist = (title: string, items: string[]): Block => ({ type: "checklist", title, text: "", items });
const fill = (title: string, items: string[]): Block => ({ type: "fill", title, text: "", items });
const tip = (text: string): Block => ({ type: "tip", title: "", text, items: [] });
const stuck = (text: string): Block => ({ type: "stuck", title: "", text, items: [] });
const template = (title: string, text: string): Block => ({ type: "template", title, text, items: [] });

export const STARTER = {
  title: "Money Reset 2027: The 30-Day Budget Planner",
  promise: "Know exactly where your money goes and start 2027 with a budget you can actually keep, in 30 days.",
  audience: "Anyone who wants a fresh financial start in the new year, especially if past budgets fell apart by February.",
  format: "10 guided worksheets, a 30-day spending tracker and a monthly check-in",
  tone: "calm, practical and encouraging",
  priceCents: 1200,
  accent: "#17604f",
};

const outline: ProductOutline = {
  subtitle: "A calm, 30-day plan to see your money clearly and set a budget that survives real life.",
  welcome:
    "This planner is for you if you have tried to budget before and it did not last. Most budgets fail because they start with rules instead of facts. This one starts with what you actually spend, then builds a plan around it.\n\nGive it 20 minutes a week for 30 days. By the last page you will have a clear picture of your money, a budget with four simple buckets, and three goals for 2027 with dates and amounts. This planner is general education, not personal financial advice; for decisions about debt, tax or investing, talk to a qualified adviser.",
  howToUse: [
    "Print the pages, or fill them in on a tablet.",
    "Work through one section a week, in order.",
    "Use the 30-day tracker every day. It takes two minutes.",
    "Keep your weekly money date, even when the week went badly.",
    "Round every number. Close enough beats perfect.",
  ],
  sections: [
    { title: "See where you stand", summary: "Get an honest picture of what comes in, what goes out and what you owe.", pageTitles: ["Your money snapshot", "The 90-day look back"] },
    { title: "Build a budget that fits", summary: "Sort your spending into four buckets and set targets you can live with.", pageTitles: ["Your four buckets", "Your bare-bones number", "Set your monthly targets"] },
    { title: "Make it stick for 30 days", summary: "Small routines that keep the plan alive when life gets in the way.", pageTitles: ["The weekly money date", "Spending rules that hold", "When a surprise bill hits"] },
    { title: "Plan your year", summary: "Turn the budget into goals with amounts and dates.", pageTitles: ["Three money goals for 2027", "Your sinking funds"] },
  ],
  extras: ["30-day spending tracker", "Monthly check-in checklist"],
};

const sections: ProductSection[] = [
  {
    title: outline.sections[0].title,
    summary: outline.sections[0].summary,
    pages: [
      {
        heading: "Your money snapshot",
        goal: "Write down today's numbers so you know your starting point.",
        blocks: [
          p("You cannot plan a route without knowing where you are. This page is a snapshot of one day, not a judgement. Use your banking app and round to the nearest ten."),
          fill("Today's numbers", ["Money in all current and savings accounts:", "Take-home pay you expect this month:", "Total owed on credit cards:", "Total owed on other loans, not counting a mortgage:", "Bills due before your next payday:"]),
          steps("Work out your breathing room", ["Add up your account balances.", "Subtract the bills due before next payday.", "The result is what you truly have available right now."]),
          tip("Take a photo of this page when it is done. In 30 days you will fill it in again and compare the two."),
          stuck("If you do not know a number, write your best guess and circle it. Finding the real figure is this week's only homework."),
        ],
      },
      {
        heading: "The 90-day look back",
        goal: "Find out what you really spend, using the last three months of statements.",
        blocks: [
          p("Your memory of what you spend is almost always lower than the truth. Three months of statements give you an average that includes the odd expensive week."),
          steps("How to do it in 30 minutes", ["Download the last three statements for every account and card you use.", "Go line by line and mark each payment as Home, Living, Debt or Fun.", "Total each group for the three months.", "Divide each total by three. That is your real monthly average."]),
          fill("Your real monthly averages", ["Home (rent or mortgage, utilities, insurance):", "Living (food, transport, phone, childcare, health):", "Debt (minimum payments on cards and loans):", "Fun (eating out, subscriptions, shopping, hobbies):"]),
          tip("Look for subscriptions you forgot about. Most people find at least one. Cancel it today, before you turn the page."),
          stuck("If three months feels like too much, do one month now. A rough picture today is worth more than a perfect one you never finish."),
        ],
      },
    ],
  },
  {
    title: outline.sections[1].title,
    summary: outline.sections[1].summary,
    pages: [
      {
        heading: "Your four buckets",
        goal: "Give every pound, dollar or euro one of four jobs.",
        blocks: [
          p("Long category lists are why budgets get abandoned. Four buckets are enough to steer by: Home, Living, Future and Fun. Debt payments above the minimum and all savings go in Future."),
          steps("Set up the buckets", ["Write your monthly take-home pay at the top.", "Copy your Home and Living averages from the look back.", "Decide a Future amount, even if it is small.", "Whatever is left is Fun. If it is negative, the next page will help."]),
          fill("My buckets", ["Take-home pay:", "Home:", "Living:", "Future (savings and extra debt payments):", "Fun:"]),
          tip("A common starting point is about half on Home and Living together, a fifth on Future and the rest on Fun. Treat it as a compass, not a rule; high rent or a low income will shift it."),
          stuck("If Home and Living already use everything, you do not have a spending problem this month, you have a gap. Skip to the bare-bones page and then to the surprise bill page for the scripts."),
        ],
      },
      {
        heading: "Your bare-bones number",
        goal: "Know the smallest amount your household can run on for one month.",
        blocks: [
          p("Your bare-bones number is what you would spend if income stopped and you cut everything that can be paused. Knowing it turns a scary unknown into a plain figure, and it tells you how big an emergency fund needs to be."),
          checklist("Keep in the bare-bones budget", ["Rent or mortgage", "Electricity, gas, water", "Basic groceries", "Transport to work", "Phone and internet at the cheapest workable plan", "Insurance you are required to have", "Minimum debt payments", "Essential medicine and childcare"]),
          fill("My number", ["My bare-bones month costs:", "One month of it saved would be reached by:", "Three months of it would be:"]),
          tip("Write this number on a sticky note inside your wallet or banking app notes. It is the most calming figure in the whole planner."),
          stuck("If the list still adds up to more than you earn, ring your largest bill provider this week and ask what hardship or payment-plan options exist. They hear the question every day."),
        ],
      },
      {
        heading: "Set your monthly targets",
        goal: "Choose targets you would bet on keeping, not ones that look good on paper.",
        blocks: [
          p("A target you hit builds confidence. A target you miss three weeks in a row gets ignored. Start by trimming each bucket by a small amount you barely notice, then tighten later."),
          steps("Set targets you can keep", ["Start from your real averages, not from what you wish you spent.", "Trim Living and Fun by no more than a tenth each for the first month.", "Move what you trimmed into Future.", "Divide Living and Fun by four to get a weekly amount.", "Write the weekly amounts where you will see them."]),
          fill("My targets for month one", ["Home per month:", "Living per week:", "Fun per week:", "Future per month:", "Day of the month my Future money moves automatically:"]),
          tip("Set up the Future transfer for the day after payday. Money that leaves before you see it rarely gets missed."),
          stuck("If you blow a weekly amount, do not restart the month. Take the difference off next week and carry on. One bad week is normal."),
        ],
      },
    ],
  },
  {
    title: outline.sections[2].title,
    summary: outline.sections[2].summary,
    pages: [
      {
        heading: "The weekly money date",
        goal: "Spend 20 minutes a week keeping the plan current.",
        blocks: [
          p("The budget is not the document; it is the habit of looking at it. Pick a fixed time each week, make a drink, and run the same short checklist every time."),
          checklist("Every week", ["Check every account balance", "Add up Living and Fun spending from the tracker", "Compare against the weekly targets", "Note any bill due in the next seven days", "Move money if a bucket is short", "Write one thing that went well"]),
          fill("My money date", ["Day and time:", "Where I will do it:", "Who else needs to be there:"]),
          tip("If you share money with a partner, keep the first few dates to facts only. Save decisions for the end, and limit them to one per week."),
          stuck("Missed a week? Do a ten-minute version today: balances and upcoming bills only. A short date keeps the habit alive."),
        ],
      },
      {
        heading: "Spending rules that hold",
        goal: "Pick two or three simple rules that remove daily decisions.",
        blocks: [
          p("Willpower runs out by the evening. Rules decided in advance do not. Choose the ones that match where your money actually leaks, using your look back."),
          checklist("Pick two or three", ["Wait 48 hours before any unplanned purchase over a set amount", "Take saved cards out of shopping apps", "One no-spend day each week", "Plan five dinners before the weekly shop", "Unsubscribe from sale emails", "Fun money goes on a separate card or in cash", "No shopping after 9 pm"]),
          fill("My rules", ["Rule one:", "Rule two:", "Rule three:", "My waiting-period amount:"]),
          tip("Write the thing you wanted on a list instead of buying it. Review the list at your money date. Most items will have lost their pull."),
          stuck("If a rule keeps breaking, it is the wrong rule. Swap it for an easier one instead of giving up on rules altogether."),
        ],
      },
      {
        heading: "When a surprise bill hits",
        goal: "Have a calm, written plan before the next unexpected cost.",
        blocks: [
          p("Something unplanned will happen in the next 30 days. Deciding now what you will do keeps one bill from wrecking the whole month."),
          steps("The order to follow", ["Pause. Nothing has to be paid in the next hour.", "Ask for the bill in writing with every item listed.", "Check it for errors and for anything you can dispute.", "Ask the provider for a payment plan before using a credit card.", "Take the first payment from Fun, then from Future. Leave Home alone."]),
          template("What to say on the phone", "Hello, my name is [NAME] and my account number is [NUMBER]. I have received a bill for [AMOUNT] that I was not expecting. I want to pay it, but I cannot pay it in one go. What payment plan options do you have, and can any fees be removed while I pay it off? Please note on my account that I called today, [DATE]."),
          tip("Always ask for the name of the person you spoke to and a reference number. Write both on the bill."),
          stuck("If the first person says no, thank them and ask to speak to the team that handles payment arrangements. The answer often changes."),
        ],
      },
    ],
  },
  {
    title: outline.sections[3].title,
    summary: outline.sections[3].summary,
    pages: [
      {
        heading: "Three money goals for 2027",
        goal: "Choose three goals and give each an amount and a date.",
        blocks: [
          p("Three goals is the most you can keep in view at once. A good goal has a number and a deadline, so you can tell whether you are on track by doing one sum."),
          steps("Turn a wish into a goal", ["Write the wish in plain words.", "Put a total amount on it.", "Pick the month you want it done by.", "Divide the amount by the number of months. That is your monthly figure.", "Check the monthly figure fits inside your Future bucket."]),
          fill("My 2027 goals", ["Goal one, amount and date:", "Monthly figure for goal one:", "Goal two, amount and date:", "Monthly figure for goal two:", "Goal three, amount and date:", "Monthly figure for goal three:"]),
          tip("Make the first goal a small emergency fund, roughly one bare-bones month. It protects the other two goals from every surprise bill."),
          stuck("If the three monthly figures add up to more than your Future bucket, keep all three goals and push the dates back. A later date is still a plan."),
        ],
      },
      {
        heading: "Your sinking funds",
        goal: "Spread the big yearly costs so they stop arriving as emergencies.",
        blocks: [
          p("Car repairs, birthdays, holidays and annual insurance are predictable. A sinking fund is simply a monthly amount set aside for each one, so the money is waiting when the bill arrives."),
          checklist("Costs that come every year", ["Car service, tyres and road tax", "Annual insurance renewals", "Birthdays and winter holidays", "Home repairs and appliances", "Travel and summer plans", "Medical, dental and pet care"]),
          steps("Set them up", ["Tick every cost that applies to you.", "Estimate the yearly total for each.", "Divide each by twelve.", "Add the monthly amounts together.", "Move that total into a separate savings pot each month."]),
          fill("My sinking funds", ["Fund one, yearly cost and monthly amount:", "Fund two, yearly cost and monthly amount:", "Fund three, yearly cost and monthly amount:", "Total to move each month:"]),
          tip("Many banking apps let you create named pots. Name each one after its job; you are far less likely to raid a pot called Car Repairs."),
        ],
      },
    ],
  },
];

/** Adds the starter product to an owner's shelf, finished and ready to publish. */
export async function addStarterProduct(owner: CurrentUser) {
  const [existing] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.userId, owner.id), eq(schema.products.title, STARTER.title)))
    .limit(1);
  if (existing) throw badRequest("The starter product is already on your shelf.");
  const id = newId("prod");
  const [row] = await db
    .insert(schema.products)
    .values({
      id,
      userId: owner.id,
      slug: `money-reset-2027-${id.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, "x")}`,
      ...STARTER,
      status: "ready",
      outline,
      sections,
    })
    .returning();
  return row;
}
