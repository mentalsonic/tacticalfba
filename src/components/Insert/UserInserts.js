import React from "react";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";

export default function UserInserts({ history, myInserts }) {
  const handleClick = (pid, iid, iName, frontPre, backPre) => {
    localStorage.setItem(
      "comb",
      JSON.stringify({
        pid: pid,
        iid: iid
      })
    );
    history.push("/address");
  };

  return (
    <div>
      <h6 className="text-dark text-center">Your saved inserts:</h6>
      <div className="mt-3 text-center">
        {myInserts.map(insert => (
          <Box mx={1} display="inline">
            <Button
              variant="outlined"
              size="small"
              key={insert.iName}
              onClick={() =>
                handleClick(
                  insert.pid,
                  insert.iid,
                  insert.iName,
                  insert.frontPre,
                  insert.backPre
                )
              }
            >
              {insert.iName}
            </Button>
          </Box>
        ))}
      </div>
    </div>
  );
}
