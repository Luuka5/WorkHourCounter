import { useCallback, useEffect, useReducer, useState } from "react";
import { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ReactDatePicker from "react-datepicker";
import ical from "ical";
import fi from "date-fns/locale/fi";
registerLocale("fi", fi);

function App() {
  const [startDate, setStartDate] = useState(new Date(0));
  const [endDate, setEndDate] = useState(new Date());

  const [calendars, setCalendars] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProsessing, setIsProsessing] = useState(false);

  const [hoursCache, updateCache] = useReducer((state, action) => {
    return { ...state, ...action };
  }, {});

  const [sum, setSum] = useState(0);

  const calculateHours = useCallback(async (refetchAll) => {
    setIsProsessing(true);
    let sum = 0;
    const promises = calendars.map(async (calendar) => {
      const { url } = calendar;
      if (!refetchAll && hoursCache[url]) {
        sum += hoursCache[url];
        return { [url]: hoursCache[url] };
      }
      const icalData = await fetch("https://corsproxy.io/?" + url).then((res) =>
        res.text()
      );
      const parsed = ical.parseICS(icalData);

      let hours = Object.values(parsed)
        .map((event) => {
          if (event.type !== "VEVENT") return;
          const start = new Date(event.start);
          const end = new Date(event.end);
          const duration = end.getTime() - start.getTime();
          if (
            start.getTime() < startDate.getTime() ||
            start.getTime() > endDate.getTime()
          ) {
            return 0;
          }
          const hours = duration / 1000 / 60 / 60;
          return hours;
        })
        .reduce((acc, val) => acc + val, 0);

      sum += hours;
      return {
        [url]: hours,
      };
    });
    let list = await Promise.all(promises);
    let res = list.reduce((acc, val) => ({ ...acc, ...val }), {});
    setSum(sum);
    updateCache(res);
    setIsProsessing(false);
  });

  useEffect(() => {
    const calendars = JSON.parse(localStorage.getItem("calendars"));
    setCalendars(calendars);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    calculateHours();
  }, [calendars, startDate, endDate]);

  useEffect(() => {
    calculateHours(true);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("calendars", JSON.stringify(calendars));
  }, [calendars, isLoaded]);

  return (
    <div className="bg-zinc-800 p-0 w-full h-full min-h-screen text-white flex flex-col justify-center items-center space-y-6">
      <h1 className="text-2xl">Count hours in a calendar</h1>
      <div className="space-y-2">
        <div className="flex space-x-2">
          <label className="whitespace-nowrap w-full">Start date:</label>
          <ReactDatePicker
            className="p-1 bg-zinc-700"
            locale="fi"
            selected={startDate}
            onChange={(date) => setStartDate(date)}
          />
        </div>
        <div className="flex space-x-2">
          <label className="whitespace-nowrap w-full">End date:</label>
          <ReactDatePicker
            className="p-1 bg-zinc-700"
            locale="fi"
            selected={endDate}
            onChange={(date) => setEndDate(date)}
          />
        </div>
      </div>
      <div className="space-y-4">
        {calendars.map((calendar, i) => (
          <div key={i} className="space-x-2 flex">
            <div className="space-y-1">
              <div className="w-full flex space-x-2">
                <label className="grow">Name:</label>
                <input
                  value={calendar.name ?? ""}
                  className="bg-zinc-700"
                  type="text"
                  onChange={(e) => {
                    const newCalendars = [...calendars];
                    newCalendars[i].name = e.target.value;
                    setCalendars(newCalendars);
                  }}
                />
              </div>
              <div className="w-full flex">
                <label className="grow">url:</label>
                <input
                  value={calendar.url ?? ""}
                  className="bg-zinc-700"
                  type="text"
                  onChange={(e) => {
                    const newCalendars = [...calendars];
                    newCalendars[i].url = e.target.value;
                    setCalendars(newCalendars);
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-1 items-center">
              <p className="text-xl">
                {hoursCache[calendar.url]
                  ? hoursCache[calendar.url]?.toFixed(2) + "h"
                  : "..."}
              </p>
              <button
                className="font-bold rounded-md bg-zinc-700 px-2 active:bg-zinc-600 transition-all hover:scale-105"
                onClick={() => {
                  const newCalendars = [...calendars];
                  newCalendars.splice(i, 1);
                  setCalendars(newCalendars);
                }}
              >
                -
              </button>
            </div>
          </div>
        ))}
        <div className="w-full flex justify-center space-x-4">
          <button
            className="font-bold rounded-md bg-zinc-700 px-2 active:bg-zinc-600 transition-all hover:scale-105"
            onClick={() =>
              setCalendars([...calendars, { name: "New calendar", url: "" }])
            }
          >
            +
          </button>
          <button
            className="font-bold rounded-md bg-zinc-700 px-2 active:bg-zinc-600 transition-all hover:scale-105"
            onClick={() => calculateHours(true)}
          >
            =
          </button>
        </div>
      </div>
      <div className="">
        <p>Sum:</p>
        <p className="text-4xl">
          {isProsessing ? "..." : sum.toFixed(2) + "h"}
        </p>
      </div>
    </div>
  );
}

export default App;
